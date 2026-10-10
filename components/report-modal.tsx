"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera, ChevronLeft, ChevronRight, Crosshair, ImagePlus,
  Loader2, LogIn, Send, Send as TgIcon, Trash2, X,
} from "lucide-react";
import { CATEGORIES, SEVERITIES, SEVERITY_COLOR, type Category, type HazardDTO, type Severity, type TelegramLog } from "@/lib/types";
import { api, cn, geoErrorKey, getFix, jsonInit, shrinkImage } from "@/lib/utils";
import type { LatLng } from "@/lib/geo";
import { useAuth, useErrText, useHazards, useI18n, useUi } from "./providers";
import { MapView } from "./map";
import { Button, CATEGORY_ICON, inputCls } from "./ui";
import { useTelegram } from "@/lib/use-telegram";

const STEPS = ["Kategoriya", "Joylashuv", "Tafsilotlar"] as const;

export function ReportModal() {
  const { reportOpen, closeReport } = useUi();

  useEffect(() => {
    if (!reportOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeReport();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [reportOpen, closeReport]);

  return (
    <AnimatePresence>
      {reportOpen && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeReport}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass max-h-[94dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl shadow-2xl sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-3xl"
          >
            <ReportForm onDone={closeReport} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 px-5 pb-3 pt-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-500",
            i <= step ? "bg-emerald-500" : "bg-zinc-900/10 dark:bg-white/10",
          )}
        />
      ))}
    </div>
  );
}

function ReportForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { upsert, hazards } = useHazards();
  const { toast } = useUi();
  const errText = useErrText();
  const { tg } = useTelegram();

  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<LatLng | null>(null);
  /** GPS accuracy in metres; null when the point was picked on the map. */
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [flyTo, setFlyTo] = useState<{ pos: LatLng; key: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [severity, setSeverity] = useState<Severity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tgPreview, setTgPreview] = useState<TelegramLog | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // On step 1 (location), auto-trigger GPS if position not yet set
  useEffect(() => {
    if (step === 1 && !pos) void locate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Wire up Telegram MainButton for the submit step
  useEffect(() => {
    if (!tg || step !== 2 || !user) return;
    const btn = tg.MainButton;
    btn.setText("Xavfni yuborish");
    btn.show();
    btn.enable();
    const handler = () => void submit();
    btn.onClick(handler);
    return () => { btn.offClick(handler); btn.hide(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tg, step, user]);

  async function locate() {
    setLocating(true);
    setError(null);
    try {
      const fix = await getFix();
      setPos(fix.pos);
      setAccuracy(Math.round(fix.accuracy));
      setFlyTo({ pos: fix.pos, key: Date.now() });
    } catch (e) {
      setError(t(geoErrorKey(e)));
    } finally {
      setLocating(false);
    }
  }

  /** Downscales the photo (≤ 1280 px, ≤ 2 MB JPEG) before it is ever uploaded. */
  async function pickFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError(t("err.bad_file_type"));
    setError(null);
    setProcessing(true);
    try {
      const small = await shrinkImage(f);
      setFile(small);
      setPreview(URL.createObjectURL(small));
    } catch (e) {
      setError(t(e instanceof Error && e.message === "too_large" ? "err.file_too_large" : "report.photoBad"));
    } finally {
      setProcessing(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    for (const r of [cameraRef, galleryRef]) if (r.current) r.current.value = "";
  }

  function next() {
    setError(null);
    if (step === 0 && !category) { setError(t("report.needCategory")); return; }
    if (step === 1 && !pos) { setError(t("report.needLocation")); return; }
    tg?.HapticFeedback.selectionChanged();
    setStep((s) => s + 1);
  }
  function back() { setError(null); setStep((s) => s - 1); }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!category) return setError(t("report.needCategory"));
    if (!pos) return setError(t("report.needLocation"));
    setBusy(true);
    setError(null);
    tg?.MainButton.showProgress();
    try {
      let imageUrl: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        imageUrl = (await api<{ url: string }>("/api/upload", { method: "POST", body: fd })).url;
      }
      const d = await api<{ hazard: HazardDTO; telegram: TelegramLog | null }>(
        "/api/hazards",
        jsonInit("POST", {
          title: title.trim() || t(`cat.${category}`),
          description,
          category,
          severity,
          lat: pos[0],
          lng: pos[1],
          imageUrl,
        }),
      );
      upsert(d.hazard);
      toast(t("report.success"));
      tg?.HapticFeedback.notificationOccurred("success");
      if (d.telegram) setTgPreview(d.telegram);
      else onDone();
    } catch (err) {
      setError(errText(err));
      tg?.HapticFeedback.notificationOccurred("error");
    } finally {
      setBusy(false);
      tg?.MainButton.hideProgress();
    }
  }

  const header = (
    <div className="sticky top-0 z-10 border-b border-zinc-900/5 bg-inherit backdrop-blur-xl dark:border-white/5">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="grid size-8 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-900/5 dark:hover:bg-white/10"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold">{t("report.title")}</h2>
            <p className="text-xs text-zinc-500">{STEPS[step]} · {step + 1}/{STEPS.length}</p>
          </div>
        </div>
        <button
          onClick={onDone}
          aria-label={t("common.close")}
          className="grid size-9 shrink-0 place-items-center rounded-xl hover:bg-zinc-900/5 dark:hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </div>
      <StepBar step={step} total={STEPS.length} />
    </div>
  );

  if (!user) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <LogIn className="size-8" />
          </div>
          <p className="font-medium">{t("report.needLogin")}</p>
          <Link href="/login" onClick={onDone}><Button>{t("nav.login")}</Button></Link>
        </div>
      </>
    );
  }

  if (tgPreview) {
    return (
      <>
        {header}
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <TgIcon className="size-4" /> {tgPreview.delivered ? t("report.tgSent") : t("report.tgPreview")}
          </div>
          <TelegramBubble text={tgPreview.text} />
          <Button className="w-full" onClick={onDone}>{t("common.close")}</Button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      {header}
      <div className="overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-5 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.category")}</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICON[c];
                  const on = category === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => { setCategory(c); tg?.HapticFeedback.selectionChanged(); }}
                      aria-pressed={on}
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-2xl border p-5 text-sm font-semibold transition",
                        on
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-md shadow-emerald-500/20 dark:text-emerald-300"
                          : "border-zinc-900/10 hover:bg-zinc-900/5 dark:border-white/10 dark:hover:bg-white/5",
                      )}
                    >
                      <Icon className="size-8" />
                      {t(`cat.${c}`)}
                    </button>
                  );
                })}
              </div>

              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.severity")}</p>
              <div className="grid grid-cols-3 gap-2">
                {SEVERITIES.map((s) => {
                  const on = severity === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => { setSeverity(s); tg?.HapticFeedback.selectionChanged(); }}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition",
                        on ? "border-transparent text-white shadow-lg" : "border-zinc-900/10 dark:border-white/10",
                      )}
                      style={on ? { background: SEVERITY_COLOR[s], boxShadow: `0 8px 24px -8px ${SEVERITY_COLOR[s]}` } : undefined}
                    >
                      {!on && <span className="size-3 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />}
                      {t(`sev.${s}`)}
                    </button>
                  );
                })}
              </div>

              {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="button" size="lg" className="mt-2 w-full" onClick={next}>
                Davom etish <ChevronRight className="size-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.location")}</span>
                <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
                  {locating ? <Loader2 className="size-3.5 animate-spin" /> : <Crosshair className="size-3.5" />}
                  {locating ? t("report.gpsLoading") : t("report.gps")}
                </Button>
              </div>
              <div className="relative h-64 overflow-hidden rounded-2xl border border-zinc-900/10 dark:border-white/10">
                <MapView className="size-full" zoom={12} hazards={hazards} picked={pos} flyTo={flyTo}
                  onMapClick={(p) => { setPos(p); setAccuracy(null); }} />
                <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[500] flex justify-center">
                  <span className="glass rounded-full px-3 py-1 text-xs font-medium tabular-nums">
                    {pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : t("report.pickHint")}
                    {pos && accuracy !== null && (
                      <span className={cn("ml-2 font-semibold", accuracy <= 30 ? "text-emerald-600" : accuracy <= 100 ? "text-orange-500" : "text-red-500")}>
                        {t("report.accuracy", { n: accuracy })}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="button" size="lg" className="w-full" onClick={next} disabled={!pos}>
                Davom etish <ChevronRight className="size-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 p-5"
            >
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="report-title">
                  {t("report.name")}
                </label>
                <input
                  id="report-title"
                  className={cn(inputCls, "mt-1.5")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("report.namePh")}
                  maxLength={120}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="report-desc">
                  {t("report.desc")}
                </label>
                <textarea
                  id="report-desc"
                  className={cn(inputCls, "mt-1.5 min-h-20 resize-y")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("report.descPh")}
                  maxLength={1000}
                />
              </div>

              {/* Photo — two inputs: camera and gallery */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.photo")}</span>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                {processing ? (
                  <div className="flex h-32 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-900/15 text-sm text-zinc-500 dark:border-white/15">
                    <Loader2 className="size-4 animate-spin" /> {t("report.processing")}
                  </div>
                ) : preview ? (
                  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                    <img src={preview} alt="" className="h-48 w-full object-cover" />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-xl bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur"
                    >
                      <Trash2 className="size-3.5" /> {t("report.remove")}
                    </button>
                  </motion.div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); void pickFile(e.dataTransfer.files[0]); }}
                    className="space-y-2 rounded-2xl border-2 border-dashed border-zinc-900/15 p-4 text-center text-sm text-zinc-500 dark:border-white/15"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()}>
                        <Camera className="size-4" /> {t("report.camera")}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => galleryRef.current?.click()}>
                        <ImagePlus className="size-4" /> {t("report.gallery")}
                      </Button>
                    </div>
                    <span className="block text-xs">{t("report.photoHint")}</span>
                  </div>
                )}
              </div>

              {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

              {!tg && (
                <Button type="submit" size="lg" className="w-full" disabled={busy || processing}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {busy ? t("report.sending") : t("report.submit")}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

/** Renders a Telegram-style chat bubble for an HTML-formatted bot message. */
export function TelegramBubble({ text, time }: { text: string; time?: string }) {
  return (
    <div className="rounded-2xl bg-[#0e1621] p-3">
      <div className="flex items-end gap-2">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">SW</div>
        <div className="max-w-full rounded-2xl rounded-bl-md bg-[#182533] px-3 py-2 text-[13px] leading-relaxed text-zinc-100">
          <p className="mb-1 text-xs font-semibold text-sky-400">SafeWay Bot</p>
          <div className="whitespace-pre-wrap break-words [&_a]:text-sky-400 [&_a]:underline" dangerouslySetInnerHTML={{ __html: text }} />
          {time && <p className="mt-1 text-right text-[10px] text-zinc-500">{time}</p>}
        </div>
      </div>
    </div>
  );
}

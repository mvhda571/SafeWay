"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Crosshair, ImagePlus, Loader2, Send, Trash2, X, LogIn, Send as TgIcon } from "lucide-react";
import { CATEGORIES, SEVERITIES, SEVERITY_COLOR, type Category, type HazardDTO, type Severity, type TelegramLog } from "@/lib/types";
import { api, cn, getPosition, jsonInit } from "@/lib/utils";
import type { LatLng } from "@/lib/geo";
import { useAuth, useHazards, useI18n, useUi } from "./providers";
import { MapView } from "./map";
import { Button, CATEGORY_ICON, Field, inputCls } from "./ui";

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
            className="glass max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            <ReportForm onDone={closeReport} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReportForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { upsert, hazards } = useHazards();
  const { toast } = useUi();

  const [pos, setPos] = useState<LatLng | null>(null);
  const [flyTo, setFlyTo] = useState<{ pos: LatLng; key: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState<Category>("open_manhole");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tgPreview, setTgPreview] = useState<TelegramLog | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function locate() {
    setLocating(true);
    setError(null);
    try {
      const p = await getPosition();
      setPos(p);
      setFlyTo({ pos: p, key: Date.now() });
    } catch {
      setError(t("nearby.denied"));
    } finally {
      setLocating(false);
    }
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 5 * 1024 * 1024) {
      setError(t("report.photoHint"));
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pos) return setError(t("report.needLocation"));
    setBusy(true);
    setError(null);
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
      if (d.telegram) setTgPreview(d.telegram);
      else onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-900/5 bg-inherit px-5 py-4 backdrop-blur-xl dark:border-white/5">
      <div>
        <h2 className="text-lg font-bold">{t("report.title")}</h2>
        <p className="text-sm text-zinc-500">{t("report.subtitle")}</p>
      </div>
      <button onClick={onDone} aria-label={t("common.close")} className="grid size-9 shrink-0 place-items-center rounded-xl hover:bg-zinc-900/5 dark:hover:bg-white/10">
        <X className="size-5" />
      </button>
    </div>
  );

  if (!user) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><LogIn className="size-8" /></div>
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
    <form onSubmit={submit}>
      {header}
      <div className="space-y-5 p-5">
        {/* Location */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.location")}</span>
            <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
              {locating ? <Loader2 className="size-3.5 animate-spin" /> : <Crosshair className="size-3.5" />}
              {locating ? t("report.gpsLoading") : t("report.gps")}
            </Button>
          </div>
          <div className="relative h-52 overflow-hidden rounded-2xl border border-zinc-900/10 dark:border-white/10">
            <MapView className="size-full" zoom={12} hazards={hazards} picked={pos} flyTo={flyTo} onMapClick={setPos} />
            <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[500] flex justify-center">
              <span className="glass rounded-full px-3 py-1 text-xs font-medium tabular-nums">
                {pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : t("report.pickHint")}
              </span>
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.category")}</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c];
              const on = category === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={on}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition",
                    on ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-zinc-900/10 hover:bg-zinc-900/5 dark:border-white/10 dark:hover:bg-white/5",
                  )}
                >
                  <Icon className="size-5" />
                  {t(`cat.${c}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.severity")}</span>
          <div className="grid grid-cols-3 gap-2">
            {SEVERITIES.map((s) => {
              const on = severity === s;
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSeverity(s)}
                  aria-pressed={on}
                  className={cn("flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition",
                    on ? "border-transparent text-white shadow-lg" : "border-zinc-900/10 dark:border-white/10")}
                  style={on ? { background: SEVERITY_COLOR[s], boxShadow: `0 8px 24px -8px ${SEVERITY_COLOR[s]}` } : undefined}
                >
                  {!on && <span className="size-3 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />}
                  {t(`sev.${s}`)}
                </button>
              );
            })}
          </div>
        </div>

        <Field label={t("report.name")}>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("report.namePh")} maxLength={120} />
        </Field>
        <Field label={t("report.desc")}>
          <textarea className={cn(inputCls, "min-h-20 resize-y")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("report.descPh")} maxLength={1000} />
        </Field>

        {/* Photo */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("report.photo")}</span>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
          {preview ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={preview} alt="" className="h-48 w-full object-cover" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-xl bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur"
              >
                <Trash2 className="size-3.5" /> {t("report.remove")}
              </button>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-900/15 p-6 text-sm text-zinc-500 transition hover:border-emerald-500 hover:bg-emerald-500/5 dark:border-white/15"
            >
              <span className="flex gap-2"><Camera className="size-5" /><ImagePlus className="size-5" /></span>
              <span className="font-medium">{t("report.photo")}</span>
              <span className="text-xs">{t("report.photoHint")}</span>
            </button>
          )}
        </div>

        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {busy ? t("report.sending") : t("report.submit")}
        </Button>
      </div>
    </form>
  );
}

/** Renders a Telegram-style chat bubble for an HTML-formatted bot message. */
export function TelegramBubble({ text, time }: { text: string; time?: string }) {
  // The text is produced by our own server with all user input HTML-escaped; only <b> and <a> tags remain.
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

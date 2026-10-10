"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ExternalLink, Loader2, MapPin, SearchX, UserRound } from "lucide-react";
import { MapView } from "@/components/map";
import { ConfirmButton } from "@/components/hazard-card";
import { useAuth, useErrText, useHazards, useI18n, useTimeAgo, useUi } from "@/components/providers";
import { Button, Card, CategoryChip, SeverityBadge, StatusBadge, STATUS_ICON } from "@/components/ui";
import { STATUSES, isAdmin, type HazardDTO, type Status } from "@/lib/types";
import { api, ApiError, cn, jsonInit } from "@/lib/utils";

export function HazardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="h-5 w-32 animate-pulse rounded bg-zinc-900/5 dark:bg-white/5" />
      <div className="h-72 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />
      <div className="h-32 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />
    </div>
  );
}

export function HazardScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { hazards, upsert } = useHazards();
  const { toast } = useUi();
  const errText = useErrText();
  const ago = useTimeAgo();
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Prefer the shared list so "+1" and admin changes elsewhere show up instantly.
  const hazard = hazards.find((h) => h.id === id) ?? null;

  useEffect(() => {
    // Always fetch the latest copy (status history, votes) and merge it into the shared list.
    api<{ hazard: HazardDTO }>(`/api/hazards/${id}`)
      .then((d) => upsert(d.hazard))
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setMissing(true); });
  }, [id, upsert]);

  async function setStatus(status: Status) {
    if (!hazard) return;
    setBusy(true);
    try {
      const d = await api<{ hazard: HazardDTO }>(`/api/hazards/${hazard.id}`, jsonInit("PATCH", { status }));
      upsert(d.hazard);
    } catch (e) {
      toast(errText(e), "err");
    } finally {
      setBusy(false);
    }
  }

  if (missing && !hazard) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <SearchX className="mx-auto size-14 text-zinc-400" />
        <p className="mt-4 font-semibold">{t("hazard.notFound")}</p>
        <Link href="/map" className="mt-6 inline-block"><Button>{t("hazard.back")}</Button></Link>
      </div>
    );
  }
  if (!hazard) return <HazardSkeleton />;

  const gmaps = `https://www.google.com/maps?q=${hazard.lat},${hazard.lng}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link href="/map" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
        <ArrowLeft className="size-4" /> {t("hazard.back")}
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn("overflow-hidden", hazard.severity === "high" && hazard.status !== "resolved" && "neon-red")}>
          {hazard.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded images served by our API
            <img src={hazard.imageUrl} alt="" className="max-h-96 w-full object-cover" />
          )}
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={hazard.severity} />
              <StatusBadge status={hazard.status} />
              <CategoryChip category={hazard.category} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">{hazard.title}</h1>
              {hazard.description && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{hazard.description}</p>}
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("hazard.address")}</dt>
                <dd className="mt-0.5 flex items-start gap-1.5"><MapPin className="mt-0.5 size-4 shrink-0 text-sky-500" />
                  {hazard.address ?? `${hazard.lat.toFixed(5)}, ${hazard.lng.toFixed(5)}`}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("hazard.reported")}</dt>
                <dd className="mt-0.5 flex items-center gap-1.5"><UserRound className="size-4 shrink-0 text-zinc-400" />
                  {hazard.authorName} · {ago(hazard.createdAt)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900/5 pt-4 dark:border-white/5">
              <ConfirmButton hazard={hazard} />
              <a href={gmaps} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400">
                {t("hazard.gmaps")} <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </Card>
      </motion.div>

      <Card className="p-5">
        <h2 className="mb-5 text-sm font-bold">{t("hazard.timeline")}</h2>
        <StatusTimeline hazard={hazard} />
        {isAdmin(user?.role) && (
          <div className="mt-6 border-t border-zinc-900/5 pt-4 dark:border-white/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("hazard.moderate")}</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Button key={s} size="sm" variant={hazard.status === s ? "primary" : "outline"} disabled={busy || hazard.status === s} onClick={() => setStatus(s)}>
                  {busy && hazard.status !== s ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {t(`status.${s}`)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="h-64 overflow-hidden p-1.5">
        <MapView className="size-full rounded-xl" hazards={[hazard]} center={[hazard.lat, hazard.lng]} zoom={16} />
      </Card>
    </div>
  );
}

const STEP_CLS: Record<Status, { bg: string; ring: string }> = {
  active: { bg: "bg-red-500", ring: "ring-red-500/30" },
  investigating: { bg: "bg-sky-500", ring: "ring-sky-500/30" },
  resolved: { bg: "bg-emerald-500", ring: "ring-emerald-500/30" },
};

/** Mavjud → O'rganilmoqda → Bartaraf etildi, with the current step highlighted. */
function StatusTimeline({ hazard }: { hazard: HazardDTO }) {
  const { t } = useI18n();
  const current = STATUSES.indexOf(hazard.status);
  const when = (s: Status) => {
    const e = [...(hazard.statusHistory ?? [])].reverse().find((x) => x.status === s);
    return e ? new Date(e.at).toLocaleDateString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
  };
  return (
    <ol className="relative grid grid-cols-3">
      {STATUSES.map((s, i) => {
        const Icon = STATUS_ICON[s];
        const done = i < current;
        const isCurrent = i === current;
        const { bg, ring } = STEP_CLS[s];
        return (
          <li key={s} className="relative flex flex-col items-center text-center" aria-current={isCurrent ? "step" : undefined}>
            {i > 0 && (
              <span className={cn("absolute right-1/2 top-5 h-1 w-full -translate-y-1/2 rounded-full", i <= current ? "bg-emerald-500" : "bg-zinc-900/10 dark:bg-white/10")} />
            )}
            <span className={cn(
              "relative z-10 grid size-10 place-items-center rounded-full text-white transition",
              isCurrent ? cn(bg, ring, "scale-110 shadow-lg ring-4") : done ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
            )}>
              {isCurrent && hazard.status !== "resolved" && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-40", bg)} />}
              {done ? <Check className="size-5" /> : <Icon className="size-5" />}
            </span>
            <span className={cn("mt-2 text-xs sm:text-sm", isCurrent ? "font-extrabold" : done ? "font-semibold" : "text-zinc-400")}>{t(`status.${s}`)}</span>
            {isCurrent && <span className="mt-0.5 rounded-full bg-zinc-900/5 px-2 text-[10px] font-semibold uppercase text-zinc-500 dark:bg-white/10">{t("hazard.current")}</span>}
            {(done || isCurrent) && when(s) && <span className="mt-0.5 text-[11px] tabular-nums text-zinc-400">{when(s)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

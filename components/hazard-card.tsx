"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, ThumbsUp, Users } from "lucide-react";
import type { HazardDTO } from "@/lib/types";
import { api, ApiError, cn } from "@/lib/utils";
import { formatDistance } from "@/lib/geo";
import { useAuth, useErrText, useHazards, useI18n, useTimeAgo, useUi } from "./providers";
import { CategoryChip, SeverityBadge, StatusBadge } from "./ui";

export function ConfirmButton({ hazard, compact }: { hazard: HazardDTO; compact?: boolean }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { upsert } = useHazards();
  const { toast } = useUi();
  const errText = useErrText();
  const [busy, setBusy] = useState(false);
  const resolved = hazard.status === "resolved";

  /** One vote per user: the server rejects repeats with 409, so there is no un-vote. */
  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) return toast(t("card.loginToVote"), "err");
    if (hazard.confirmedByMe || resolved) return;
    setBusy(true);
    // Optimistic update: the count changes immediately.
    upsert({ ...hazard, confirmedByMe: true, confirmCount: hazard.confirmCount + 1 });
    try {
      const d = await api<{ hazard: HazardDTO }>(`/api/hazards/${hazard.id}/confirm`, { method: "POST" });
      upsert(d.hazard);
    } catch (err) {
      // On 409 the server sends back the real state of the hazard.
      const server = err instanceof ApiError ? (err.data.hazard as HazardDTO | undefined) : undefined;
      upsert(server ?? hazard);
      toast(errText(err), "err");
    } finally {
      setBusy(false);
    }
  }

  if (hazard.status === "resolved") return null;

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={busy || resolved || hazard.confirmedByMe}
      aria-pressed={hazard.confirmedByMe}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed",
        resolved && "opacity-50",
        compact ? "h-11 px-3 text-xs md:h-8 md:px-2.5" : "h-11 px-3 text-sm md:h-9",
        hazard.confirmedByMe
          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
          : "bg-zinc-900/5 text-zinc-800 hover:bg-zinc-900/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15",
      )}
    >
      <ThumbsUp className="size-3.5" />
      {hazard.confirmedByMe ? t("card.confirmed") : t("card.confirm")}
      <span className="rounded-md bg-black/10 px-1.5 tabular-nums dark:bg-white/15">{hazard.confirmCount}</span>
    </motion.button>
  );
}

export function HazardCard({
  hazard, distance, onClick, active, index = 0,
}: { hazard: HazardDTO; distance?: number; onClick?: () => void; active?: boolean; index?: number }) {
  const { t } = useI18n();
  const ago = useTimeAgo();
  const red = hazard.severity === "high" && hazard.status !== "resolved";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), type: "spring", stiffness: 300, damping: 26 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "glass cursor-pointer overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-lg",
        red && "neon-red",
        active && "ring-2 ring-emerald-500",
      )}
    >
      {hazard.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded images served by our API
        <img src={hazard.imageUrl} alt="" className="h-32 w-full object-cover" />
      )}
      <div className="space-y-2.5 p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={hazard.severity} />
          <StatusBadge status={hazard.status} />
          {distance !== undefined && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
              <MapPin className="size-3" /> {formatDistance(distance)}
            </span>
          )}
        </div>
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{hazard.title}</h3>
          {hazard.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{hazard.description}</p>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <CategoryChip category={hazard.category} />
          <span className="flex items-center gap-2 text-[11px] text-zinc-400" suppressHydrationWarning>
            {ago(hazard.createdAt)}
            <Link href={`/hazards/${hazard.id}`} onClick={(e) => e.stopPropagation()}
              className="-my-3 inline-flex min-h-11 items-center font-semibold text-emerald-600 hover:underline dark:text-emerald-400 md:my-0 md:min-h-0">
              {t("card.details")}<ChevronRight className="size-3" />
            </Link>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-900/5 pt-2.5 dark:border-white/5">
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <Users className="size-3.5" /> {t("card.confirms", { n: hazard.confirmCount })}
          </span>
          <ConfirmButton hazard={hazard} compact />
        </div>
      </div>
    </motion.article>
  );
}

/** Compact content rendered inside Leaflet popups. */
export function HazardPopup({ hazard }: { hazard: HazardDTO }) {
  const { t } = useI18n();
  const ago = useTimeAgo();
  return (
    <div className="space-y-2 font-sans">
      {hazard.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded images served by our API
        <img src={hazard.imageUrl} alt="" className="-mx-1 h-28 w-[calc(100%+0.5rem)] rounded-xl object-cover" />
      )}
      <div className="flex flex-wrap gap-1">
        <SeverityBadge severity={hazard.severity} />
        <StatusBadge status={hazard.status} />
      </div>
      <p className="!m-0 text-sm font-semibold leading-snug">{hazard.title}</p>
      {hazard.description && <p className="!m-0 text-xs text-zinc-500">{hazard.description}</p>}
      <p className="!m-0 text-[11px] text-zinc-400" suppressHydrationWarning>{t("card.by")}: {hazard.authorName} · {ago(hazard.createdAt)}</p>
      <div className="flex items-center justify-between gap-2">
        <ConfirmButton hazard={hazard} compact />
        <Link href={`/hazards/${hazard.id}`} className="inline-flex min-h-11 items-center text-xs font-semibold !text-emerald-600 hover:underline md:min-h-0">
          {t("card.details")}<ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

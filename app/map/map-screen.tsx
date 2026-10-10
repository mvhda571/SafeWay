"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Crosshair, Filter, List, Loader2, Radar, RotateCcw } from "lucide-react";
import { MapView } from "@/components/map";
import { HazardCard, HazardPopup } from "@/components/hazard-card";
import { useHazards, useI18n } from "@/components/providers";
import { CATEGORY_ICON, STATUS_ICON } from "@/components/ui";
import { CATEGORIES, STATUSES, type Category, type HazardDTO, type Status } from "@/lib/types";
import { haversine, type LatLng } from "@/lib/geo";
import { cn, geoErrorKey } from "@/lib/utils";

const RADIUS = 500;

export function MapScreen() {
  const { t } = useI18n();
  const { hazards, loading } = useHazards();
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [tab, setTab] = useState<"nearby" | "list">("list");
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<"nearby.denied" | "nearby.unavailable" | null>(null);
  const watchId = useRef<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ pos: LatLng; zoom?: number; key: number } | null>(null);

  const filtered = useMemo(
    () => hazards.filter((h) => (category === "all" || h.category === category) && (status === "all" || h.status === status)),
    [hazards, category, status],
  );

  const nearby = useMemo(() => {
    if (!userPos) return [];
    return hazards
      .filter((h) => h.status !== "resolved")
      .map((h) => ({ h, d: haversine(userPos, [h.lat, h.lng]) }))
      .filter((x) => x.d <= RADIUS)
      .sort((a, b) => a.d - b.d);
  }, [hazards, userPos]);
  const nearbyHigh = nearby.filter((x) => x.h.severity === "high").length;

  /** Keeps following the GPS position so the 500 m list and alert update while walking. */
  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) return setGeoError("nearby.unavailable");
    setLocating(true);
    setGeoError(null);
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    let first = true;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const pos: LatLng = [p.coords.latitude, p.coords.longitude];
        setUserPos(pos);
        setLocating(false);
        setGeoError(null);
        if (first) setFlyTo({ pos, zoom: 16, key: Date.now() });
        first = false;
      },
      (e) => {
        setLocating(false);
        setGeoError(geoErrorKey(e));
        if (e.code === 1 && watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, []);

  function locate() {
    setTab("nearby");
    startWatch();
  }

  // If location permission was granted before, start the radar right away.
  useEffect(() => {
    navigator.permissions?.query({ name: "geolocation" })
      .then((r) => { if (r.state === "granted") startWatch(); })
      .catch(() => {});
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [startWatch]);

  // Vibrate whenever a new high-risk hazard enters the 500 m radius.
  const highKey = nearby.filter((x) => x.h.severity === "high").map((x) => x.h.id).join(",");
  const alerted = useRef("");
  useEffect(() => {
    const fresh = highKey.split(",").some((id) => id && !alerted.current.split(",").includes(id));
    if (fresh) navigator.vibrate?.([400, 150, 400, 150, 400]);
    alerted.current = highKey;
  }, [highKey]);

  function focus(h: HazardDTO) {
    setSelected(h.id);
    setFlyTo((prev) => ({ pos: [h.lat, h.lng], zoom: 17, key: (prev?.key ?? 0) + 1 }));
  }

  return (
    <div className="flex flex-col md:h-[calc(100dvh-4rem)] md:flex-row">
      {/* Map */}
      <div className="relative h-[58dvh] md:order-2 md:h-full md:flex-1">
        <MapView
          className="size-full"
          hazards={filtered}
          userPos={userPos}
          radius={userPos ? RADIUS : undefined}
          flyTo={flyTo}
          onSelect={(h) => setSelected(h.id)}
          renderPopup={(h) => <HazardPopup hazard={h} />}
        />
        <div className="pointer-events-none absolute right-3 top-3 z-[500] flex flex-col items-end gap-2">
          <button
            onClick={locate}
            className="glass pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold shadow-lg md:min-h-0"
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4 text-sky-500" />}
            {locating ? t("nearby.locating") : t("nearby.locate")}
          </button>
          <Legend />
        </div>

        {/* Proximity alert floating over the map */}
        <AnimatePresence>
          {userPos && nearby.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "absolute inset-x-3 bottom-3 z-[500] mx-auto flex max-w-md items-center gap-3 rounded-2xl p-3 text-white shadow-2xl md:bottom-6",
                nearbyHigh ? "bg-gradient-to-r from-red-600 to-rose-600" : "bg-gradient-to-r from-orange-500 to-amber-500",
              )}
              role="alert"
            >
              <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white/20">
                <AlertTriangle className="size-5" />
                <span className="absolute inset-0 animate-ping rounded-xl bg-white/20" />
              </span>
              <div className="text-sm">
                {nearbyHigh > 0 && <p className="font-black uppercase tracking-wide">{t("nearby.alertTitle")}</p>}
                <p className="font-bold">{t("nearby.alert", { n: nearby.length })}</p>
                {nearbyHigh > 0 && <p className="text-white/85">{t("nearby.alertHigh", { n: nearbyHigh })}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <aside className="glass flex flex-col border-y-0 border-l-0 md:order-1 md:h-full md:w-[400px]">
        <div className="space-y-3 border-b border-zinc-900/5 p-4 dark:border-white/5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Filter className="size-4" />{t("filter.title")}</h2>
            {(category !== "all" || status !== "all") && (
              <button onClick={() => { setCategory("all"); setStatus("all"); }} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-600 md:min-h-0">
                <RotateCcw className="size-3" /> {t("filter.reset")}
              </button>
            )}
          </div>
          <ChipRow label={t("filter.category")}>
            <Chip on={category === "all"} onClick={() => setCategory("all")}>{t("filter.all")}</Chip>
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c];
              return <Chip key={c} on={category === c} onClick={() => setCategory(c)}><Icon className="size-3.5" />{t(`cat.${c}`)}</Chip>;
            })}
          </ChipRow>
          <ChipRow label={t("filter.status")}>
            <Chip on={status === "all"} onClick={() => setStatus("all")}>{t("filter.all")}</Chip>
            {STATUSES.map((s) => {
              const Icon = STATUS_ICON[s];
              return <Chip key={s} on={status === s} onClick={() => setStatus(s)}><Icon className="size-3.5" />{t(`status.${s}`)}</Chip>;
            })}
          </ChipRow>
        </div>

        <div className="flex gap-1 p-2">
          {([["list", List, t("list.title")], ["nearby", Radar, t("nearby.title")]] as const).map(([k, Icon, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn("relative flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition", tab === k ? "text-zinc-900 dark:text-white" : "text-zinc-500")}
            >
              {tab === k && <motion.span layoutId="map-tab" className="absolute inset-0 -z-10 rounded-xl bg-zinc-900/5 dark:bg-white/10" />}
              <Icon className="size-4" /> {label}
              {k === "nearby" && userPos && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{nearby.length}</span>}
            </button>
          ))}
        </div>

        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 pb-24 md:pb-6">
          {tab === "list" ? (
            <>
              <p className="text-xs text-zinc-500">{t("list.count", { n: filtered.length })}</p>
              {loading && <SkeletonList />}
              <AnimatePresence mode="popLayout">
                {filtered.map((h, i) => (
                  <HazardCard key={h.id} hazard={h} index={i} active={selected === h.id} onClick={() => focus(h)}
                    distance={userPos ? haversine(userPos, [h.lat, h.lng]) : undefined} />
                ))}
              </AnimatePresence>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-sky-500/10 p-3">
                <Radar className="size-8 shrink-0 text-sky-500" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{t("nearby.title")}</p>
                  <p className="text-xs text-zinc-500">{t("nearby.radius", { r: RADIUS })}</p>
                </div>
                <button onClick={locate} aria-label={t("nearby.locate")} className="grid size-11 place-items-center rounded-xl bg-sky-500 text-xs font-semibold text-white">
                  {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
                </button>
              </div>
              {geoError && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{t(geoError)}</p>}
              {userPos && nearby.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">{t("nearby.empty")}</p>}
              {nearby.map(({ h, d }, i) => (
                <HazardCard key={h.id} hazard={h} index={i} distance={d} active={selected === h.id} onClick={() => focus(h)} />
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="relative">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">{children}</div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/80 to-transparent dark:from-zinc-900/70" />
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition md:min-h-0",
        on ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25" : "border-zinc-900/10 hover:bg-zinc-900/5 dark:border-white/10 dark:hover:bg-white/5",
      )}
    >
      {children}
    </button>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <div className="glass pointer-events-auto hidden rounded-xl px-3 py-2 text-xs font-medium shadow-lg sm:block">
      {(["low", "medium", "high"] as const).map((s) => (
        <div key={s} className="flex items-center gap-2 py-0.5">
          <span className="size-2.5 rounded-full" style={{ background: { low: "#facc15", medium: "#f97316", high: "#ef4444" }[s] }} />
          {t(`sev.${s}`)}
        </div>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <>
      {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />)}
    </>
  );
}

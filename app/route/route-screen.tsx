"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Crosshair, Footprints, Loader2, MapPinned, Navigation, Route as RouteIcon, Ruler, Search } from "lucide-react";
import { MapView, type MapRoute } from "@/components/map";
import { HazardPopup } from "@/components/hazard-card";
import { useHazards, useI18n } from "@/components/providers";
import { Button, Card, inputCls } from "@/components/ui";
import { formatDistance, type LatLng } from "@/lib/geo";
import { api, cn, getPosition } from "@/lib/utils";

type Which = "home" | "school";
interface Point { pos: LatLng; label: string }
interface ScoredRoute {
  geometry: LatLng[]; distance: number; duration: number; risk: number;
  hazardIds: string[]; highCount: number; kind: "direct" | "alternative" | "detour" | "fallback";
}

export function RouteScreen() {
  const { t } = useI18n();
  const { hazards } = useHazards();
  const [points, setPoints] = useState<Record<Which, Point | null>>({ home: null, school: null });
  const [picking, setPicking] = useState<Which | null>(null);
  const [result, setResult] = useState<{ safest: ScoredRoute; others: ScoredRoute[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fitTo, setFitTo] = useState<{ points: LatLng[]; key: number } | null>(null);

  const active = useMemo(() => hazards.filter((h) => h.status !== "resolved"), [hazards]);

  function setPoint(which: Which, p: Point) {
    setPoints((prev) => ({ ...prev, [which]: p }));
    setResult(null);
    setFitTo({ points: [p.pos], key: Date.now() });
  }

  async function build() {
    if (!points.home || !points.school) return;
    setBusy(true);
    setError(null);
    try {
      const q = (p: LatLng) => `${p[0]},${p[1]}`;
      const d = await api<{ safest: ScoredRoute; others: ScoredRoute[] }>(
        `/api/route-plan?from=${q(points.home.pos)}&to=${q(points.school.pos)}`,
      );
      setResult(d);
      setFitTo({ points: d.safest.geometry, key: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const routes: MapRoute[] = result
    ? [
        ...result.others.map((r) => ({ geometry: r.geometry, color: "#94a3b8", weight: 5, dashed: true, opacity: 0.8 })),
        { geometry: result.safest.geometry, color: "#10b981", weight: 7 },
      ]
    : [];

  const endpoints = [
    points.home && { pos: points.home.pos, label: "🏠", color: "#6366f1" },
    points.school && { pos: points.school.pos, label: "🏫", color: "#0ea5e9" },
  ].filter(Boolean) as { pos: LatLng; label: string; color: string }[];

  const s = result?.safest;

  return (
    <div className="flex flex-col md:h-[calc(100dvh-4rem)] md:flex-row">
      <div className={cn("relative h-[55dvh] md:order-2 md:h-full md:flex-1", picking && "[&_.leaflet-container]:cursor-crosshair!")}>
        <MapView
          className="size-full"
          hazards={active}
          routes={routes}
          endpoints={endpoints}
          fitTo={fitTo}
          renderPopup={(h) => <HazardPopup hazard={h} />}
          onMapClick={(pos) => {
            if (!picking) return;
            setPoint(picking, { pos, label: `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` });
            setPicking(null);
          }}
        />
        <AnimatePresence>
          {picking && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xl"
            >
              {t("route.picking")} — {t(picking === "home" ? "route.home" : "route.school")}
            </motion.div>
          )}
        </AnimatePresence>
        {result && (
          <div className="glass absolute bottom-3 left-3 z-[500] flex gap-3 rounded-xl px-3 py-2 text-xs font-medium shadow-lg">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-emerald-500" />{t("route.legendSafe")}</span>
            {result.others.length > 0 && (
              <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-slate-400" />{t("route.legendOther")}</span>
            )}
          </div>
        )}
      </div>

      <aside className="glass no-scrollbar space-y-4 overflow-y-auto border-y-0 border-l-0 p-4 md:order-1 md:h-full md:w-[400px]">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold"><RouteIcon className="size-5 text-emerald-500" />{t("route.title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("route.subtitle")}</p>
        </div>

        <div className="relative space-y-3">
          <span className="absolute bottom-10 left-[19px] top-10 w-0.5 bg-gradient-to-b from-indigo-500 to-sky-500 opacity-40" />
          <PointInput which="home" icon="🏠" color="bg-indigo-500" value={points.home} picking={picking === "home"}
            onPick={() => setPicking(picking === "home" ? null : "home")} onSet={(p) => setPoint("home", p)} />
          <PointInput which="school" icon="🏫" color="bg-sky-500" value={points.school} picking={picking === "school"}
            onPick={() => setPicking(picking === "school" ? null : "school")} onSet={(p) => setPoint("school", p)} />
        </div>

        <Button size="lg" className="w-full" disabled={!points.home || !points.school || busy} onClick={build}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
          {busy ? t("route.building") : t("route.build")}
        </Button>
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}

        <AnimatePresence>
          {s && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{t("route.safest")}</p>
                  <div className="mt-2 flex gap-6">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-white/80"><Ruler className="size-3" />{t("route.distance")}</p>
                      <p className="text-2xl font-extrabold">{formatDistance(s.distance)}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-white/80"><Footprints className="size-3" />{t("route.duration")}</p>
                      {/* Walking speed ~4.5 km/h, independent of the routing profile used */}
                      <p className="text-2xl font-extrabold">{Math.max(1, Math.round(s.distance / 75))} {t("route.min")}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-4 text-sm">
                  {s.kind === "fallback" && <Note warn>{t("route.fallback")}</Note>}
                  {s.kind === "detour" && <Note>{t("route.detour")}</Note>}
                  {s.hazardIds.length === 0 ? <Note>{t("route.clean")}</Note> : <Note warn>{t("route.passes", { n: s.hazardIds.length })}</Note>}
                  {s.highCount > 0 && <Note warn>{t("route.highWarn")}</Note>}
                </div>
              </Card>
              {result.others.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("route.other")}</p>
                  {result.others.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-zinc-900/10 px-3 py-2 text-sm dark:border-white/10">
                      <span>{formatDistance(r.distance)}</span>
                      <span className={cn("text-xs font-semibold", r.highCount ? "text-red-500" : "text-orange-500")}>
                        ⚠ {r.hazardIds.length}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
}

function Note({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  const Icon = warn ? AlertTriangle : CheckCircle2;
  return (
    <p className={cn("flex items-start gap-2", warn ? "text-orange-600 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-400")}>
      <Icon className="mt-0.5 size-4 shrink-0" />{children}
    </p>
  );
}

function PointInput({
  which, icon, color, value, picking, onPick, onSet,
}: {
  which: Which; icon: string; color: string; value: Point | null; picking: boolean;
  onPick: () => void; onSet: (p: Point) => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // Debounced Nominatim search
  useEffect(() => {
    if (q.trim().length < 3 || q === value?.label) return;
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await api<{ results: { name: string; lat: number; lng: number }[] }>(`/api/geocode?q=${encodeURIComponent(q)}`);
        setResults(d.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [q, value?.label]);

  const shown = value && q === "" ? value.label : q;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className={cn("z-10 grid size-10 shrink-0 place-items-center rounded-xl text-lg shadow-md", color)}>{icon}</span>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            className={cn(inputCls, "pl-9")}
            placeholder={`${t(which === "home" ? "route.home" : "route.school")} — ${t("route.searchPh")}`}
            value={shown}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => value && q === "" && setQ(value.label)}
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-zinc-400" />}
        </div>
      </div>
      <div className="mt-1.5 flex gap-1.5 pl-12">
        {which === "home" && (
          <button
            onClick={async () => {
              setLocating(true);
              try {
                const p = await getPosition();
                onSet({ pos: p, label: t("route.myLocation") });
                setQ("");
              } catch {} finally { setLocating(false); }
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900/5 px-2 py-1 text-xs font-medium dark:bg-white/10"
          >
            {locating ? <Loader2 className="size-3 animate-spin" /> : <Crosshair className="size-3" />}{t("route.myLocation")}
          </button>
        )}
        <button
          onClick={onPick}
          className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium", picking ? "bg-indigo-600 text-white" : "bg-zinc-900/5 dark:bg-white/10")}
        >
          <MapPinned className="size-3" />{t("route.pickOnMap")}
        </button>
      </div>
      <AnimatePresence>
        {results.length > 0 && q && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass absolute inset-x-0 top-12 z-20 ml-12 overflow-hidden rounded-xl shadow-xl"
          >
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-900/5 dark:hover:bg-white/10"
                  onClick={() => { onSet({ pos: [r.lat, r.lng], label: r.name }); setQ(""); setResults([]); }}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

import "server-only";
import type { Hazard } from "./types";
import { distanceToPolyline, haversine, offset, type LatLng } from "./geo";

/** Hazards closer than this to a path are considered "on" the path. */
const BUFFER_M = 60;
const WEIGHT = { low: 2, medium: 10, high: 100 } as const;
const OSRM_SERVERS = [
  "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
  "https://router.project-osrm.org/route/v1/foot",
];

export interface ScoredRoute {
  geometry: LatLng[];
  distance: number;
  duration: number;
  risk: number;
  hazardIds: string[];
  highCount: number;
  kind: "direct" | "alternative" | "detour" | "fallback";
}

interface OsrmRoute {
  geometry: { coordinates: [number, number][] };
  distance: number;
  duration: number;
}

async function osrm(points: LatLng[], alternatives: boolean): Promise<OsrmRoute[]> {
  const coords = points.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(";");
  const qs = `overview=full&geometries=geojson&alternatives=${alternatives ? 3 : "false"}`;
  for (const base of OSRM_SERVERS) {
    try {
      const res = await fetch(`${base}/${coords}?${qs}`, {
        headers: { "User-Agent": "SafeWay/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { code: string; routes?: OsrmRoute[] };
      if (data.code === "Ok" && data.routes?.length) return data.routes;
    } catch {
      // try next server
    }
  }
  return [];
}

function score(geometry: LatLng[], hazards: Hazard[]) {
  const near = hazards.filter((h) => distanceToPolyline([h.lat, h.lng], geometry) <= BUFFER_M);
  return {
    risk: near.reduce((s, h) => s + WEIGHT[h.severity], 0),
    hazardIds: near.map((h) => h.id),
    highCount: near.filter((h) => h.severity === "high").length,
  };
}

function toScored(r: OsrmRoute, hazards: Hazard[], kind: ScoredRoute["kind"]): ScoredRoute {
  const geometry = r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng);
  return { geometry, distance: r.distance, duration: r.duration, kind, ...score(geometry, hazards) };
}

const better = (a: ScoredRoute, b: ScoredRoute) => a.risk - b.risk || a.distance - b.distance;

/**
 * Finds the walking route that avoids red (high) hazards:
 * 1. ask OSRM for the direct route + alternatives and rank by risk;
 * 2. if the best still passes a red hazard, try via-points offset around it.
 */
export async function findSafeRoute(from: LatLng, to: LatLng, all: Hazard[]) {
  const hazards = all.filter((h) => h.status !== "resolved");
  const base = await osrm([from, to], true);

  if (!base.length) {
    const geometry = [from, to];
    const fallback: ScoredRoute = {
      geometry, distance: haversine(from, to), duration: haversine(from, to) / 1.3,
      kind: "fallback", ...score(geometry, hazards),
    };
    return { safest: fallback, others: [] as ScoredRoute[] };
  }

  const candidates = base.map((r, i) => toScored(r, hazards, i === 0 ? "direct" : "alternative"));
  const direct = candidates[0];
  let best = [...candidates].sort(better)[0];

  if (best.highCount > 0) {
    const reds = hazards.filter((h) => best.hazardIds.includes(h.id) && h.severity === "high").slice(0, 2);
    const vias: LatLng[][] = [];
    for (const h of reds) {
      for (const d of [250, 450]) {
        for (const [n, e] of [[d, 0], [-d, 0], [0, d], [0, -d]]) vias.push([from, offset([h.lat, h.lng], n, e), to]);
      }
    }
    const detours = (await Promise.all(vias.map((v) => osrm(v, false))))
      .flatMap((rs) => rs.slice(0, 1))
      .map((r) => toScored(r, hazards, "detour"))
      .filter((r) => r.distance < direct.distance * 2.2);
    candidates.push(...detours);
    best = [...candidates].sort(better)[0];
  }

  return { safest: best, others: candidates.filter((c) => c !== best && c.kind !== "detour").slice(0, 2) };
}

import "server-only";
import type { Hazard } from "./types";
import { distanceToPolyline, haversine, offset, type LatLng } from "./geo";

/** Hazards closer than this to a path are considered "on" the path. */
const BUFFER_M = 45;
const WEIGHT = { low: 2, medium: 10, high: 100 } as const;
/** Whole planning must finish well inside Netlify's 10 s function limit. */
const BUDGET_MS = 7000;
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
  kind: "direct" | "alternative" | "detour";
}

interface OsrmRoute {
  geometry: { coordinates: [number, number][] };
  distance: number;
  duration: number;
}

export class RoutingUnavailableError extends Error {}

async function osrm(points: LatLng[], alternatives: boolean, deadline: number): Promise<OsrmRoute[]> {
  const coords = points.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(";");
  const qs = `overview=full&geometries=geojson&alternatives=${alternatives ? 3 : "false"}`;
  for (const base of OSRM_SERVERS) {
    const left = deadline - Date.now();
    if (left < 500) break;
    try {
      const res = await fetch(`${base}/${coords}?${qs}`, {
        headers: { "User-Agent": "SafeWay/1.0" },
        // Leave time for the fallback server if the first one hangs.
        signal: AbortSignal.timeout(Math.min(left, 4000)),
        cache: "no-store",
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
 * Finds the walking route with the fewest hazards near it:
 * 1. ask OSRM for the direct route + alternatives and rank by risk;
 * 2. if the best still passes a hazard, try via-points offset around the worst ones.
 * Returns the safest route (green), the shortest/other routes (grey dashed) and how many hazards
 * near the shortest route the safest one avoids. Throws RoutingUnavailableError if OSRM is down.
 */
export async function findSafeRoute(from: LatLng, to: LatLng, all: Hazard[]) {
  const deadline = Date.now() + BUDGET_MS;
  const hazards = all.filter((h) => h.status !== "resolved");
  const base = await osrm([from, to], true, deadline);
  if (!base.length) throw new RoutingUnavailableError("Routing service unavailable");

  const candidates = base.map((r, i) => toScored(r, hazards, i === 0 ? "direct" : "alternative"));
  const shortest = () => [...candidates].sort((a, b) => a.distance - b.distance)[0];
  let best = [...candidates].sort(better)[0];

  if (best.risk > 0 && deadline - Date.now() > 1500) {
    // Detour around up to two of the most dangerous hazards on the current best route.
    const worst = hazards
      .filter((h) => best.hazardIds.includes(h.id))
      .sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity])
      .slice(0, 2);
    // Via-points 300 m to either side of each hazard, perpendicular to the home→school direction.
    // Only 4 requests in total: the public OSRM servers throttle larger bursts.
    const len = haversine(from, to) || 1;
    const north = (to[0] - from[0]) * 110540 / len;
    const east = (to[1] - from[1]) * 111320 * Math.cos((from[0] * Math.PI) / 180) / len;
    const vias: LatLng[][] = [];
    for (const h of worst) {
      for (const d of [300, -300]) vias.push([from, offset([h.lat, h.lng], east * d, -north * d), to]);
    }
    const limit = shortest().distance * 2.2;
    const detours = (await Promise.all(vias.map((v) => osrm(v, false, deadline))))
      .flatMap((rs) => rs.slice(0, 1))
      .map((r) => toScored(r, hazards, "detour"))
      .filter((r) => r.distance < limit);
    candidates.push(...detours);
    best = [...candidates].sort(better)[0];
  }

  const short = shortest();
  const others = [short, ...candidates.filter((c) => c.kind === "alternative")]
    .filter((c, i, arr) => c !== best && arr.indexOf(c) === i)
    .slice(0, 2);
  const avoided = short.hazardIds.filter((id) => !best.hazardIds.includes(id)).length;
  return { safest: best, others, avoided };
}

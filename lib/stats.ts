import "server-only";
import { CATEGORIES, SEVERITIES, STATUSES, type Hazard, type PublicStats } from "./types";

/** Dashboard numbers, computed from the hazards in the database (shared by /api/stats and /api/admin/stats). */
export function computeStats(hazards: Hazard[]): PublicStats {
  const total = hazards.length;
  const resolved = hazards.filter((h) => h.status === "resolved").length;
  // Reports per day for the last 14 days (UTC+5, Tashkent).
  const day = (iso: string) => new Date(new Date(iso).getTime() + 5 * 3600000).toISOString().slice(0, 10);
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = day(new Date(Date.now() - (13 - i) * 86400000).toISOString());
    return { date: d, count: hazards.filter((h) => day(h.createdAt) === d).length };
  });
  return {
    total,
    resolved,
    resolvedPct: total ? Math.round((resolved / total) * 100) : 0,
    highActive: hazards.filter((h) => h.severity === "high" && h.status !== "resolved").length,
    confirmations: hazards.reduce((s, h) => s + h.confirmations.length, 0),
    byStatus: STATUSES.map((s) => ({ key: s, count: hazards.filter((h) => h.status === s).length })),
    byCategory: CATEGORIES.map((c) => ({ key: c, count: hazards.filter((h) => h.category === c).length })),
    bySeverity: SEVERITIES.map((s) => ({ key: s, count: hazards.filter((h) => h.severity === s).length })),
    daily,
  };
}

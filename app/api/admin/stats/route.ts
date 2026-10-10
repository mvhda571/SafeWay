import { handle, requireAdmin } from "@/lib/auth";
import { listHazards, listTelegram } from "@/lib/store";
import { CATEGORIES, STATUSES, SEVERITIES } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const hazards = await listHazards();
    const total = hazards.length;
    const resolved = hazards.filter((h) => h.status === "resolved").length;

    const byStatus = STATUSES.map((s) => ({ key: s, count: hazards.filter((h) => h.status === s).length }));
    const byCategory = CATEGORIES.map((c) => ({ key: c, count: hazards.filter((h) => h.category === c).length }));
    const bySeverity = SEVERITIES.map((s) => ({ key: s, count: hazards.filter((h) => h.severity === s).length }));

    // Reports per day for the last 14 days (UTC+5, Tashkent).
    const day = (iso: string) => new Date(new Date(iso).getTime() + 5 * 3600000).toISOString().slice(0, 10);
    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = day(new Date(Date.now() - (13 - i) * 86400000).toISOString());
      return { date: d, count: hazards.filter((h) => day(h.createdAt) === d).length };
    });

    return Response.json({
      total,
      resolved,
      resolvedPct: total ? Math.round((resolved / total) * 100) : 0,
      highActive: hazards.filter((h) => h.severity === "high" && h.status !== "resolved").length,
      confirmations: hazards.reduce((s, h) => s + h.confirmations.length, 0),
      byStatus,
      byCategory,
      bySeverity,
      daily,
      telegram: await listTelegram(),
    });
  });
}

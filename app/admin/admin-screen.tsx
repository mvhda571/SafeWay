"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, Loader2, Search, Send, ShieldX, Trash2 } from "lucide-react";
import { useAuth, useErrText, useHazards, useI18n, useUi } from "@/components/providers";
import { Button, Card, CategoryChip, SeverityBadge, inputCls } from "@/components/ui";
import { TelegramBubble } from "@/components/report-modal";
import { STATUSES, isAdmin, type HazardDTO, type PublicStats, type Status, type TelegramLog } from "@/lib/types";
import { api, cn, jsonInit } from "@/lib/utils";
import { StatsDashboard } from "@/components/stats-dashboard";

interface Stats extends PublicStats {
  telegram: TelegramLog[];
}

export function AdminScreen() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const { hazards, loading: hazardsLoading, upsert, remove, reload } = useHazards();
  const { toast } = useUi();
  const errText = useErrText();
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try { setStats(await api<Stats>("/api/admin/stats")); } catch {}
  }, []);

  const allowed = isAdmin(user?.role);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch once access is known
    if (allowed) void loadStats();
  }, [allowed, loadStats, hazards.length]);

  // Keep numbers live: hazards added by other users show up within 30 s.
  useEffect(() => {
    if (!allowed) return;
    const id = setInterval(() => { void reload(); void loadStats(); }, 30000);
    return () => clearInterval(id);
  }, [allowed, reload, loadStats]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? hazards.filter((h) => `${h.title} ${h.description} ${h.authorName}`.toLowerCase().includes(s)) : hazards;
  }, [hazards, q]);

  async function setStatus(h: HazardDTO, status: Status) {
    setBusyId(h.id);
    try {
      const d = await api<{ hazard: HazardDTO }>(`/api/hazards/${h.id}`, jsonInit("PATCH", { status }));
      upsert(d.hazard);
      void loadStats();
    } catch (e) {
      toast(errText(e), "err");
    } finally {
      setBusyId(null);
    }
  }

  async function del(h: HazardDTO) {
    if (!confirm(t("admin.confirmDelete"))) return;
    setBusyId(h.id);
    try {
      await api(`/api/hazards/${h.id}`, { method: "DELETE" });
      remove(h.id);
      void loadStats();
    } catch (e) {
      toast(errText(e), "err");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-zinc-400" /></div>;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldX className="mx-auto size-14 text-red-500" />
        <p className="mt-4 font-semibold">{t("admin.forbidden")}</p>
        <Link href="/login" className="mt-6 inline-block"><Button>{t("nav.login")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("admin.title")}</h1>
        <p className="text-sm text-zinc-500">{t("admin.subtitle")}</p>
      </motion.div>

      <StatsDashboard stats={stats} />

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900/5 p-4 dark:border-white/5">
            <h2 className="text-sm font-bold">{t("admin.table")} <span className="text-zinc-400">({rows.length})</span></h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input className={cn(inputCls, "py-2 pl-9")} placeholder={t("admin.search")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-semibold">{t("admin.col.hazard")}</th>
                  <th className="px-2 py-3 font-semibold">{t("admin.col.severity")}</th>
                  <th className="px-2 py-3 font-semibold">{t("admin.col.status")}</th>
                  <th className="px-2 py-3 text-right font-semibold">{t("admin.col.votes")}</th>
                  <th className="px-2 py-3 font-semibold">{t("admin.col.date")}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t("admin.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {hazardsLoading && [0, 1, 2, 3].map((i) => (
                  <tr key={`sk-${i}`} className="border-t border-zinc-900/5 dark:border-white/5">
                    <td colSpan={6} className="px-4 py-3"><div className="h-8 animate-pulse rounded-lg bg-zinc-900/5 dark:bg-white/5" /></td>
                  </tr>
                ))}
                <AnimatePresence initial={false}>
                  {rows.map((h) => (
                    <motion.tr
                      key={h.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn("border-t border-zinc-900/5 align-middle dark:border-white/5", h.severity === "high" && h.status !== "resolved" && "bg-red-500/[0.04]")}
                    >
                      <td className="max-w-xs px-4 py-3">
                        <Link href={`/hazards/${h.id}`} className="block truncate font-semibold hover:underline">{h.title}</Link>
                        <div className="flex items-center gap-2"><CategoryChip category={h.category} /><span className="truncate text-[11px] text-zinc-400">· {h.authorName}</span></div>
                      </td>
                      <td className="px-2 py-3"><SeverityBadge severity={h.severity} /></td>
                      <td className="px-2 py-3">
                        <select
                          value={h.status}
                          disabled={busyId === h.id}
                          onChange={(e) => setStatus(h, e.target.value as Status)}
                          className="rounded-lg border border-zinc-900/10 bg-transparent px-2 py-1 text-xs font-medium dark:border-white/10 dark:bg-zinc-900"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums">{h.confirmCount}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-xs tabular-nums text-zinc-500">{h.createdAt.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {h.status !== "resolved" && (
                            <Button size="sm" variant="outline" disabled={busyId === h.id} onClick={() => setStatus(h, "resolved")}>
                              <CheckCheck className="size-3.5 text-emerald-500" /> {t("admin.resolve")}
                            </Button>
                          )}
                          <Button size="sm" variant="danger" disabled={busyId === h.id} onClick={() => del(h)} aria-label={t("admin.delete")}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Send className="size-4 text-sky-500" />{t("admin.telegram")}</h2>
          <div className="no-scrollbar max-h-[560px] space-y-3 overflow-y-auto">
            {!stats && [0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />)}
            {stats && !stats.telegram.length && <p className="py-8 text-center text-sm text-zinc-500">{t("admin.tgEmpty")}</p>}
            {stats?.telegram.map((m) => (
              <div key={m.id} className="space-y-1">
                <span title={m.error && m.error !== "simulation" ? m.error : undefined}
                  className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    m.delivered ? "bg-emerald-500/15 text-emerald-600"
                      : m.error && m.error !== "simulation" ? "bg-red-500/15 text-red-600" : "bg-zinc-500/15 text-zinc-500")}>
                  {m.delivered ? t("admin.delivered") : m.error && m.error !== "simulation" ? t("admin.tgFailed") : t("admin.simulated")}
                </span>
                <TelegramBubble text={m.text} time={new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

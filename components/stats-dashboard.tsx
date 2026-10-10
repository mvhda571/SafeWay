"use client";

import { motion } from "framer-motion";
import { AlertOctagon, BarChart3, CheckCheck, PieChart, ThumbsUp, TrendingUp } from "lucide-react";
import type { PublicStats } from "@/lib/types";
import { useI18n } from "./providers";
import { Card } from "./ui";
import { CategoryBars, DailyArea, SeverityStack, StatusStack } from "./charts";

/** KPI tiles + charts. `stats === null` renders skeletons (never an "empty" state while loading). */
export function StatsDashboard({ stats }: { stats: PublicStats | null }) {
  const { t } = useI18n();
  const tiles = [
    { label: t("admin.total"), value: stats?.total, icon: BarChart3, cls: "from-sky-400 to-blue-600" },
    { label: t("admin.resolvedPct"), value: stats && `${stats.resolvedPct}%`, icon: CheckCheck, cls: "from-emerald-400 to-emerald-600" },
    { label: t("admin.highActive"), value: stats?.highActive, icon: AlertOctagon, cls: "from-red-400 to-rose-600" },
    { label: t("admin.confirms"), value: stats?.confirmations, icon: ThumbsUp, cls: "from-violet-400 to-indigo-600" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((x, i) => (
          <motion.div key={x.label} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.06 }}>
            <Card className="flex items-center gap-3 p-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${x.cls} text-white shadow-md`}><x.icon className="size-5" /></span>
              <div className="min-w-0">
                {stats ? <p className="text-2xl font-black tabular-nums">{x.value}</p> : <p className="my-1 h-6 w-12 animate-pulse rounded-md bg-zinc-900/10 dark:bg-white/10" />}
                <p className="truncate text-xs text-zinc-500">{x.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {!stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><PieChart className="size-4" />{t("admin.byStatus")}</h2>
            <StatusStack data={stats.byStatus} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><AlertOctagon className="size-4" />{t("admin.bySeverity")}</h2>
            <SeverityStack data={stats.bySeverity} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><BarChart3 className="size-4" />{t("admin.byCategory")}</h2>
            <CategoryBars data={stats.byCategory.map((c) => ({ label: t(`cat.${c.key}`), count: c.count }))} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><TrendingUp className="size-4" />{t("admin.daily")}</h2>
            <DailyArea data={stats.daily} />
          </Card>
        </div>
      )}
    </>
  );
}

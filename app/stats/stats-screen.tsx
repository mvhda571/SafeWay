"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHazards, useI18n } from "@/components/providers";
import { StatsDashboard } from "@/components/stats-dashboard";
import type { PublicStats } from "@/lib/types";
import { api } from "@/lib/utils";

/** Public, read-only statistics. Refreshes every 30 s and whenever a hazard is added in this tab. */
export function StatsScreen() {
  const { t } = useI18n();
  const { hazards } = useHazards();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const load = () => api<PublicStats>("/api/stats").then(setStats).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [hazards.length]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("stats.title")}</h1>
        <p className="text-sm text-zinc-500">{t("stats.subtitle")}</p>
      </motion.div>
      <StatsDashboard stats={stats} />
    </div>
  );
}

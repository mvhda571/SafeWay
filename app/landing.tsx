"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BellRing, Map, Navigation, Radar, ShieldCheck, Sparkles, ThumbsUp, Users } from "lucide-react";
import { useHazards, useI18n } from "@/components/providers";
import { HazardCard } from "@/components/hazard-card";
import { MapView } from "@/components/map";
import { Button, Card } from "@/components/ui";
import type { TKey } from "@/lib/i18n";

const FEATURES: { icon: typeof Map; t: TKey; d: TKey; cls: string }[] = [
  { icon: Map, t: "f.map.t", d: "f.map.d", cls: "from-emerald-400 to-emerald-600" },
  { icon: ThumbsUp, t: "f.vote.t", d: "f.vote.d", cls: "from-indigo-400 to-indigo-600" },
  { icon: Navigation, t: "f.route.t", d: "f.route.d", cls: "from-teal-400 to-cyan-600" },
  { icon: Radar, t: "f.radar.t", d: "f.radar.d", cls: "from-sky-400 to-blue-600" },
  { icon: BellRing, t: "f.tg.t", d: "f.tg.d", cls: "from-orange-400 to-red-500" },
  { icon: ShieldCheck, t: "f.admin.t", d: "f.admin.d", cls: "from-violet-400 to-fuchsia-600" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function Landing() {
  const { t } = useI18n();
  const { hazards, loading } = useHazards();
  const active = hazards.filter((h) => h.status !== "resolved").length;
  const resolved = hazards.length - active;
  const votes = hazards.reduce((s, h) => s + h.confirmCount, 0);

  const stats: { label: string; value: number; cls: string }[] = [
    { label: t("stats.total"), value: hazards.length, cls: "text-zinc-900 dark:text-white" },
    { label: t("stats.active"), value: active, cls: "text-red-500" },
    { label: t("stats.resolved"), value: resolved, cls: "text-emerald-500" },
    { label: t("stats.votes"), value: votes, cls: "text-indigo-500" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero */}
      <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
        <motion.div initial="hidden" animate="show" className="space-y-6">
          <motion.span variants={fadeUp} className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="size-3.5" /> {t("hero.badge")}
          </motion.span>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {t("hero.title1")}{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 bg-clip-text text-transparent">{t("hero.title2")}</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="max-w-xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
            {t("hero.subtitle")}
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-3">
            <Link href="/map"><Button size="lg">{t("hero.ctaMap")} <ArrowRight className="size-4" /></Button></Link>
            <Link href="/route"><Button size="lg" variant="outline"><Navigation className="size-4" /> {t("hero.ctaRoute")}</Button></Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-400/30 via-sky-400/20 to-red-400/30 blur-2xl" />
          <Card className="relative h-80 overflow-hidden p-1.5 sm:h-[26rem]">
            <MapView className="size-full rounded-xl" hazards={hazards} zoom={12} />
          </Card>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}>
            <Card className="p-5">
              <p className={`text-3xl font-black sm:text-4xl ${s.cls}`}>{loading ? "—" : s.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </section>
      <div className="mt-3 flex justify-end">
        <Link href="/stats" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-emerald-600 md:min-h-0">
          {t("stats.more")} <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Features */}
      <section className="py-16">
        <h2 className="mb-8 text-center text-2xl font-extrabold sm:text-3xl">{t("features.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.t} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i % 3}>
              <Card className="group h-full p-6 transition hover:-translate-y-1 hover:shadow-xl">
                <span className={`mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${f.cls} text-white shadow-lg transition group-hover:scale-110`}>
                  <f.icon className="size-6" />
                </span>
                <h3 className="font-bold">{t(f.t)}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t(f.d)}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section className="pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold"><Users className="size-6 text-emerald-500" />{t("recent.title")}</h2>
          <Link href="/map" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-emerald-600 md:min-h-0">{t("nav.map")} <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hazards.slice(0, 6).map((h, i) => <HazardCard key={h.id} hazard={h} index={i} />)}
        </div>
      </section>
    </div>
  );
}

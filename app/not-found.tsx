"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ShieldAlert } from "lucide-react";
import { useI18n } from "@/components/providers";

export default function NotFound() {
  const { locale } = useI18n();

  const messages: Record<string, { title: string; desc: string; btn: string }> = {
    uz: { title: "Sahifa topilmadi", desc: "Siz izlagan sahifa mavjud emas yoki o'chirilgan.", btn: "Bosh sahifaga" },
    ru: { title: "Страница не найдена", desc: "Страница, которую вы ищете, не существует или была удалена.", btn: "На главную" },
    en: { title: "Page not found", desc: "The page you are looking for doesn't exist or has been removed.", btn: "Go home" },
  };

  const m = messages[locale] ?? messages.uz;

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 p-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="grid size-24 place-items-center rounded-3xl bg-gradient-to-br from-red-400 to-rose-600 text-white shadow-2xl shadow-red-500/30"
      >
        <ShieldAlert className="size-12" />
      </motion.div>
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <p className="text-6xl font-black tabular-nums text-zinc-200 dark:text-zinc-800">404</p>
        <h1 className="text-2xl font-bold">{m.title}</h1>
        <p className="max-w-sm text-zinc-500">{m.desc}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
        >
          <Home className="size-4" />
          {m.btn}
        </Link>
      </motion.div>
    </div>
  );
}

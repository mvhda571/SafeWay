"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ambulance, Flame, Phone, ShieldAlert, Siren, X, GraduationCap } from "lucide-react";
import { useI18n } from "./providers";
import type { TKey } from "@/lib/i18n";

const inspectorPhone = process.env.NEXT_PUBLIC_INSPECTOR_PHONE;

const NUMBERS: { key: TKey; tel: string; icon: typeof Phone; cls: string }[] = [
  { key: "sos.police", tel: "102", icon: ShieldAlert, cls: "from-blue-500 to-blue-700" },
  { key: "sos.ambulance", tel: "103", icon: Ambulance, cls: "from-red-500 to-red-700" },
  { key: "sos.fire", tel: "1050", icon: Flame, cls: "from-orange-500 to-orange-700" },
  ...(inspectorPhone
    ? [{ key: "sos.inspector" as TKey, tel: inspectorPhone, icon: GraduationCap, cls: "from-emerald-500 to-emerald-700" }]
    : []),
];

/** Floating SOS panel (102 / 103 / 1050 / school inspector) — collapsed by default on all screens. */
export function EmergencyBar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    // Phone: sits above the floating bottom nav and the iPhone home indicator.
    <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-[1000] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass w-64 origin-bottom-right rounded-2xl p-2 shadow-2xl"
          >
            <p className="px-2 pb-1.5 pt-1 text-xs font-bold uppercase tracking-wider text-red-500">{t("sos.title")}</p>
            {NUMBERS.map(({ key, tel, icon: Icon, cls }, i) => (
              <motion.a
                key={key}
                href={`tel:${tel}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-zinc-900/5 dark:hover:bg-white/10"
              >
                <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br ${cls} text-white shadow-md`}>
                  <Icon className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{t(key)}</span>
                  <span className="block text-xs tabular-nums text-zinc-500">{tel}</span>
                </span>
                <Phone className="size-4 text-zinc-400" />
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={t("sos.title")}
        aria-expanded={open}
        className="relative grid size-12 place-items-center rounded-full md:size-14 bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-[0_10px_30px_-6px_rgb(239_68_68/0.8)]"
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />}
        {open ? <X className="size-6" /> : <Siren className="size-6" />}
      </motion.button>
    </div>
  );
}

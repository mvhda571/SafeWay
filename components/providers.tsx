"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { dictionaries, LOCALES, type Locale, type TKey } from "@/lib/i18n";
import type { HazardDTO, Role } from "@/lib/types";
import { api, ApiError } from "@/lib/utils";

// ---------------- i18n ----------------
type TFn = (key: TKey, vars?: Record<string, string | number>) => string;
const I18nCtx = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: TFn } | null>(null);

export const useI18n = () => {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
};

// ---------------- auth ----------------
export interface ClientUser { id: string; name: string; email: string; role: Role }
const AuthCtx = createContext<{
  user: ClientUser | null;
  loading: boolean;
  setUser: (u: ClientUser | null) => void;
  logout: () => Promise<void>;
} | null>(null);

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};

// ---------------- hazards ----------------
const HazardsCtx = createContext<{
  hazards: HazardDTO[];
  loading: boolean;
  reload: () => Promise<void>;
  upsert: (h: HazardDTO) => void;
  remove: (id: string) => void;
} | null>(null);

export const useHazards = () => {
  const c = useContext(HazardsCtx);
  if (!c) throw new Error("useHazards outside provider");
  return c;
};

// ---------------- report modal + toasts ----------------
interface Toast { id: number; text: string; kind: "ok" | "err" }
const UiCtx = createContext<{
  reportOpen: boolean;
  openReport: () => void;
  closeReport: () => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
} | null>(null);

export const useUi = () => {
  const c = useContext(UiCtx);
  if (!c) throw new Error("useUi outside provider");
  return c;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("uz");
  const [user, setUser] = useState<ClientUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hazards, setHazards] = useState<HazardDTO[]>([]);
  const [hazardsLoading, setHazardsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sw_locale") as Locale | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted client preference after hydration
      if (saved && LOCALES.includes(saved)) setLocaleState(saved);
    } catch {}
    api<{ user: ClientUser | null }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    const taglines: Record<string, string> = {
      uz: "SafeWay — Bolalar uchun xavfsiz yo'l",
      ru: "SafeWay — Безопасный путь для детей",
      en: "SafeWay — A safer way to school",
    };
    document.title = taglines[locale] ?? taglines.uz;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("sw_locale", l); } catch {}
  }, []);

  const t = useCallback<TFn>((key, vars) => {
    let s: string = dictionaries[locale][key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }, [locale]);

  const reload = useCallback(async () => {
    try {
      const d = await api<{ hazards: HazardDTO[] }>("/api/hazards");
      setHazards(d.hazards);
    } finally {
      setHazardsLoading(false);
    }
  }, []);

  // Re-fetch when the user changes so `confirmedByMe` is accurate.
  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, user?.id, reload]);

  const upsert = useCallback((h: HazardDTO) => {
    setHazards((prev) => (prev.some((x) => x.id === h.id) ? prev.map((x) => (x.id === h.id ? h : x)) : [h, ...prev]));
  }, []);
  const remove = useCallback((id: string) => setHazards((prev) => prev.filter((x) => x.id !== id)), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, text, kind }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4000);
  }, []);

  const i18n = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  const auth = useMemo(() => ({ user, loading: authLoading, setUser, logout }), [user, authLoading, logout]);
  const hz = useMemo(() => ({ hazards, loading: hazardsLoading, reload, upsert, remove }), [hazards, hazardsLoading, reload, upsert, remove]);
  const ui = useMemo(() => ({
    reportOpen,
    openReport: () => setReportOpen(true),
    closeReport: () => setReportOpen(false),
    toast,
  }), [reportOpen, toast]);

  return (
    <I18nCtx.Provider value={i18n}>
      <AuthCtx.Provider value={auth}>
        <HazardsCtx.Provider value={hz}>
          <UiCtx.Provider value={ui}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 top-20 z-[1200] flex flex-col items-center gap-2 px-4">
              <AnimatePresence>
                {toasts.map((x) => (
                  <motion.div
                    key={x.id}
                    initial={{ opacity: 0, y: -16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.95 }}
                    className="glass pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl"
                  >
                    {x.kind === "ok"
                      ? <CheckCircle2 className="size-4 text-emerald-500" />
                      : <AlertTriangle className="size-4 text-red-500" />}
                    {x.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </UiCtx.Provider>
        </HazardsCtx.Provider>
      </AuthCtx.Provider>
    </I18nCtx.Provider>
  );
}

/** Translates an error thrown by `api()` using its `code` (`err.<code>` keys), with a generic fallback. */
export function useErrText() {
  const { t } = useI18n();
  return useCallback((e: unknown) => {
    const key = `err.${e instanceof ApiError ? e.code : ""}`;
    return key in dictionaries.uz ? t(key as TKey) : t("common.error");
  }, [t]);
}

export function useTimeAgo() {
  const { t } = useI18n();
  return (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return t("common.justNow");
    if (m < 60) return t("common.minAgo", { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("common.hAgo", { n: h });
    return t("common.dAgo", { n: Math.floor(h / 24) });
  };
}

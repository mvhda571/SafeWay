"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, LogOut, Mail, Shield, User } from "lucide-react";
import { useAuth, useErrText, useI18n, useUi, type ClientUser } from "@/components/providers";
import { Button, Card, inputCls } from "@/components/ui";
import { isAdmin, type Role } from "@/lib/types";
import { api, cn, jsonInit } from "@/lib/utils";

export interface DemoAccount { role: Role; email: string; password: string; label?: string }

export function AuthScreen({ demo }: { demo: DemoAccount[] }) {
  const { t, setLocale } = useI18n();
  const errText = useErrText();
  const { user, setUser, logout } = useAuth();
  const { toast } = useUi();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent, creds?: { email: string; password: string }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = creds ?? (mode === "login" ? { email, password } : { name, email, password });
      const url = creds || mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const d = await api<{ user: ClientUser; lang?: "uz" | "ru" | "en" | null }>(url, jsonInit("POST", body));
      if (d.lang) setLocale(d.lang); // language saved in the profile
      setUser(d.user);
      router.push(isAdmin(d.user.role) ? "/admin" : "/map");
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="space-y-4 p-6 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-2xl font-bold text-white">{user.name.charAt(0)}</span>
          <div>
            <p className="text-lg font-bold">{user.name}</p>
            <p className="text-sm text-zinc-500">{user.email}</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t(`role.${user.role}`)}</span>
          </div>
          <Button variant="outline" className="w-full" onClick={async () => { await logout(); router.push("/"); }}>
            <LogOut className="size-4" /> {t("nav.logout")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center px-4 pt-10 pb-28 md:py-10">
      <div className="pointer-events-none absolute -left-10 top-20 size-56 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-20 size-56 rounded-full bg-indigo-500/30 blur-3xl" />

      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full">
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="text-center">
            <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-500/30">
              <Shield className="size-7" />
            </span>
            <h1 className="text-2xl font-extrabold">{t("auth.welcome")}</h1>
            <p className="mt-1 text-sm text-zinc-500">{t("auth.subtitle")}</p>
          </div>

          <div className="relative grid grid-cols-2 rounded-xl bg-zinc-900/5 p-1 dark:bg-white/10">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={cn("relative z-10 min-h-11 rounded-lg py-2 text-sm font-semibold transition", mode === m ? "text-zinc-900 dark:text-white" : "text-zinc-500")}
              >
                {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-lg bg-white shadow dark:bg-zinc-700" />}
                {t(m === "login" ? "auth.login" : "auth.signup")}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => toast(t("auth.googleSoon"), "err")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-900/10 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <svg viewBox="0 0 48 48" className="size-5" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {t("auth.google")}
          </button>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-900/10 dark:bg-white/10" />{t("auth.or")}<span className="h-px flex-1 bg-zinc-900/10 dark:bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <IconInput icon={User} placeholder={t("auth.name")} value={name} onChange={setName} autoComplete="name" required />
                </motion.div>
              )}
            </AnimatePresence>
            <IconInput icon={Mail} type="email" placeholder={t("auth.email")} value={email} onChange={setEmail} autoComplete="email" required />
            <IconInput icon={Lock} type="password" placeholder={t("auth.password")} value={password} onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} />
            {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t(mode === "login" ? "auth.submitLogin" : "auth.submitSignup")}
            </Button>
          </form>

          {demo.length > 0 && <div className="rounded-xl bg-zinc-900/[0.03] p-3 dark:bg-white/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("auth.demo")}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {demo.map((d) => (
                <button
                  key={d.email}
                  disabled={busy}
                  onClick={(e) => submit(e, d)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition",
                    d.label === "Super Admin"
                      ? "border-amber-400/50 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/30"
                      : "border-zinc-900/10 hover:bg-white dark:border-white/10 dark:hover:bg-white/10",
                  )}
                >
                  {d.label ?? t(`role.${d.role}`)}
                  {d.label === "Super Admin" && <span className="ml-1 opacity-60">⚠</span>}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-zinc-400">Demo maʼlumotlar. ⚠ Super Admin — sinov uchun.</p>
          </div>}
        </Card>
      </motion.div>
    </div>
  );
}

function IconInput({
  icon: Icon, value, onChange, placeholder, ...props
}: { icon: typeof Mail; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = placeholder ? `input-${placeholder.toLowerCase().replace(/\s+/g, "-")}` : undefined;
  return (
    <div className="relative">
      {placeholder && id && <label htmlFor={id} className="sr-only">{placeholder}</label>}
      <Icon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
      <input id={id} placeholder={placeholder} className={cn(inputCls, "h-11 pl-10")} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, LogIn, LogOut, Map, Moon, Navigation, Plus, Shield, Sun, UserRound } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { useI18n, useAuth, useUi } from "./providers";
import { EmergencyBar } from "./emergency-bar";
import { ReportModal } from "./report-modal";
import { toggleTheme } from "./theme";
import { TelegramBridge } from "./telegram-bridge";
import { LOCALES } from "@/lib/i18n";
import { isAdmin } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { user, logout } = useAuth();
  const { openReport } = useUi();
  const admin = isAdmin(user?.role);

  const nav = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/map", label: t("nav.map"), icon: Map },
    { href: "/route", label: t("nav.route"), icon: Navigation },
    ...(admin ? [{ href: "/admin", label: t("nav.admin"), icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="bg-aurora pointer-events-none fixed inset-0 -z-10" />

      {/* Header */}
      <header className="glass sticky top-0 z-[1100] border-x-0 border-t-0 pt-[var(--tg-safe-top,0px)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/" className="flex min-h-11 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <Shield className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight">SafeWay</span>
              <span className="hidden text-[11px] text-zinc-500 sm:block">{t("app.tagline")}</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Active key={n.href} href={n.href}>
                {(on) => (
                  <Link
                    href={n.href}
                    className={cn(
                      "relative rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                      on && "text-zinc-900 dark:text-white",
                    )}
                  >
                    {on && (
                      <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-xl bg-zinc-900/5 dark:bg-white/10" />
                    )}
                    {n.label}
                  </Link>
                )}
              </Active>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={openReport}
              className="hidden h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-red-500 to-red-600 px-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:brightness-110 md:inline-flex"
            >
              <Plus className="size-4" /> {t("nav.report")}
            </button>

            {/* Phone: one 44 px button cycling UZ → RU → EN; desktop: the full switcher. */}
            <button
              onClick={() => setLocale(LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length] as Locale)}
              aria-label="Language"
              className="grid size-11 place-items-center rounded-xl bg-zinc-900/5 text-xs font-bold uppercase dark:bg-white/10 md:hidden"
            >
              {locale}
            </button>
            <div className="hidden rounded-xl bg-zinc-900/5 p-0.5 dark:bg-white/10 md:flex" role="group" aria-label="Language">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  aria-pressed={locale === l}
                  className={cn(
                    "relative rounded-lg px-2 py-1 text-xs font-bold uppercase text-zinc-500 transition",
                    locale === l && "text-zinc-900 dark:text-white",
                  )}
                >
                  {locale === l && (
                    <motion.span layoutId="lang-pill" className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm dark:bg-zinc-700" />
                  )}
                  {l}
                </button>
              ))}
            </div>

            <button
              onClick={toggleTheme}
              aria-label={t("theme.toggle")}
              className="grid size-11 place-items-center rounded-xl text-zinc-600 transition hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10 md:size-9"
            >
              <Sun className="hidden size-[18px] dark:block" />
              <Moon className="size-[18px] dark:hidden" />
            </button>

            {user ? (
              <div className="hidden items-center gap-1 md:flex">
                <Link href="/profile" title={t("nav.profile")}
                  className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-zinc-900/5 dark:hover:bg-white/10">
                  <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-xs font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <span className="hidden max-w-32 truncate text-sm font-semibold lg:block">{user.name}</span>
                </Link>
                <button
                  onClick={async () => { await logout(); router.push("/"); }}
                  aria-label={t("nav.logout")}
                  className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-900/5 dark:hover:bg-white/10"
                >
                  <LogOut className="size-[18px]" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-zinc-900/10 px-3 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10 md:inline-flex"
              >
                <LogIn className="size-4" /> {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Room for the floating bottom nav, the SOS button and the iPhone home indicator on phones,
          so the last element on a page can always be scrolled clear of them. */}
      <main className="flex-1 pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom),var(--tg-safe-bottom,0px))] z-[1100] rounded-2xl shadow-2xl md:hidden">
        <div className="grid grid-cols-5 items-center">
          {nav.slice(0, 2).map((n) => <BottomItem key={n.href} {...n} />)}
          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={openReport}
              aria-label={t("nav.report")}
              className="-mt-7 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_10px_25px_-5px_rgb(239_68_68/0.7)] ring-4 ring-[var(--bg)]"
            >
              <Plus className="size-7" />
            </motion.button>
          </div>
          <BottomItem href="/route" label={t("nav.route")} icon={Navigation} />
          {user ? (
            <BottomItem href="/profile" label={t("nav.profile")} icon={UserRound} />
          ) : (
            <BottomItem href="/login" label={t("nav.login")} icon={LogIn} />
          )}
        </div>
      </nav>

      <EmergencyBar />
      <ReportModal />
      <Suspense fallback={null}><TelegramBridge /></Suspense>
    </div>
  );
}

/**
 * Reads the pathname in a small leaf under <Suspense>: with cacheComponents, routes with dynamic
 * params (/hazards/[id]) only know the pathname at request time, and an unwrapped read in the
 * shared shell would block prerendering. The fallback renders the item as inactive.
 */
function Active({ href, children }: { href: string; children: (on: boolean) => React.ReactNode }) {
  return (
    <Suspense fallback={children(false)}>
      <ActiveInner href={href}>{children}</ActiveInner>
    </Suspense>
  );
}

function ActiveInner({ href, children }: { href: string; children: (on: boolean) => React.ReactNode }) {
  const pathname = usePathname();
  return children(href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function BottomItem(props: { href: string; label: string; icon: typeof Home }) {
  return <Active href={props.href}>{(on) => <BottomLink {...props} active={on} />}</Active>;
}

function BottomLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link href={href} className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium">
      {active && <motion.span layoutId="bottom-pill" className="absolute inset-x-2 inset-y-1 -z-10 rounded-xl bg-emerald-500/10" />}
      <Icon className={cn("size-5", active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500")} />
      <span className={cn("max-w-[4.5rem] truncate", active ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-500")}>{label}</span>
    </Link>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays, CheckCheck, ChevronRight, Crosshair, LayoutDashboard, Loader2, LogOut, Mail, MapPinned,
  Moon, Plus, Send, Sun, ThumbsUp, TriangleAlert,
} from "lucide-react";
import { MapView } from "@/components/map";
import { useAuth, useErrText, useHazards, useI18n, useUi } from "@/components/providers";
import { setTheme, useIsDark } from "@/components/theme";
import { Button, Card, CategoryChip, StatusBadge } from "@/components/ui";
import { LOCALES, type Locale, type TKey } from "@/lib/i18n";
import { SEVERITY_COLOR, isAdmin, type HazardDTO, type ProfileStats, type PublicUser, type SavedPlace } from "@/lib/types";
import type { LatLng } from "@/lib/geo";
import { api, ApiError, cn, getPosition, initials, jsonInit } from "@/lib/utils";

interface Me { user: PublicUser; stats: ProfileStats; hazards: HazardDTO[] }

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME?.replace(/^@/, "");

export function ProfileScreen() {
  const { t, locale, setLocale } = useI18n();
  const { user, loading, logout } = useAuth();
  const { hazards: shared } = useHazards();
  const errText = useErrText();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/login");
    api<Me>("/api/me").then((d) => {
      setMe(d);
      // A device without its own language choice adopts the one saved in the account.
      let local: string | null = null;
      try { local = localStorage.getItem("sw_locale"); } catch {}
      if (!local && d.user.lang) setLocale(d.user.lang);
    }).catch(async (e) => {
      // Session cookie points to an account that no longer exists → start over.
      if (e instanceof ApiError && e.status === 401) {
        await logout();
        router.replace("/login");
      }
    });
  }, [loading, user, logout, router, setLocale]);

  // Keep the list in sync with "+1" / admin changes made elsewhere in this tab.
  const hazards = me ? me.hazards.map((h) => shared.find((x) => x.id === h.id) ?? h) : [];

  async function changeLang(l: Locale) {
    setLocale(l);
    try { await api("/api/me", jsonInit("PATCH", { lang: l })); } catch { /* local choice still applies */ }
  }

  if (!user || !me) return <ProfileSkeleton />;
  const u = me.user;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      {/* User card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-xl font-bold text-white shadow-lg">
            {initials(u.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{u.name}</h1>
            <p className="flex items-center gap-1.5 truncate text-sm text-zinc-500"><Mail className="size-3.5 shrink-0" />{u.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300">{t(`role.${u.role}`)}</span>
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <CalendarDays className="size-3.5" />{t("profile.joined", { d: new Date(u.createdAt).toLocaleDateString(locale) })}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {([
          ["profile.reported", me.stats.reported, TriangleAlert, "from-orange-400 to-red-500"],
          ["profile.resolved", me.stats.resolved, CheckCheck, "from-emerald-400 to-emerald-600"],
          ["profile.confirmed", me.stats.confirmed, ThumbsUp, "from-violet-400 to-indigo-600"],
        ] as const).map(([key, value, Icon, cls]) => (
          <Card key={key} className="p-3 sm:p-4">
            <span className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br ${cls} text-white shadow-md`}><Icon className="size-4" /></span>
            <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
            <p className="text-[11px] leading-tight text-zinc-500 sm:text-xs">{t(key as TKey)}</p>
          </Card>
        ))}
      </div>

      {/* My reports */}
      <Card className="p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold">{t("profile.myReports")}</h2>
        {hazards.length === 0 ? <EmptyReports /> : (
          <ul className="-mx-2 divide-y divide-zinc-900/5 dark:divide-white/5">
            {hazards.map((h) => (
              <li key={h.id}>
                <Link href={`/hazards/${h.id}`} className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-zinc-900/5 dark:hover:bg-white/5">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[h.severity] }} aria-label={t(`sev.${h.severity}`)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{h.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <CategoryChip category={h.category} />
                      <span className="text-[11px] tabular-nums text-zinc-400">{new Date(h.createdAt).toLocaleDateString(locale)}</span>
                    </span>
                  </span>
                  <StatusBadge status={h.status} />
                  <ChevronRight className="size-4 shrink-0 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Settings */}
      <Card className="space-y-5 p-4 sm:p-5">
        <h2 className="text-sm font-bold">{t("profile.settings")}</h2>

        <Setting label={t("profile.lang")}>
          <Segmented options={LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))} value={locale} onChange={changeLang} />
        </Setting>

        <Setting label={t("profile.theme")}>
          <ThemeSwitch />
        </Setting>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("profile.places")}</p>
          <p className="text-xs text-zinc-500">{t("profile.placesHint")}</p>
          <PlaceEditor kind="home" icon="🏠" value={u.home ?? null} onSaved={(user) => setMe((m) => m && { ...m, user })} onError={errText} />
          <PlaceEditor kind="school" icon="🏫" value={u.school ?? null} onSaved={(user) => setMe((m) => m && { ...m, user })} onError={errText} />
        </div>

        {BOT && (
          <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer"
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-sky-500/10 p-3 transition hover:bg-sky-500/15">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500 text-white"><Send className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("profile.telegram")}</span>
              <span className="block text-xs text-zinc-500">{t("profile.telegramHint")} · @{BOT}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-zinc-400" />
          </a>
        )}
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {isAdmin(u.role) && (
          <Link href="/admin"><Button variant="outline" size="lg" className="w-full"><LayoutDashboard className="size-4" />{t("profile.adminPanel")}</Button></Link>
        )}
        <Button variant="danger" size="lg" className={cn("w-full", !isAdmin(u.role) && "sm:col-span-2")}
          onClick={async () => { await logout(); router.push("/"); }}>
          <LogOut className="size-4" />{t("nav.logout")}
        </Button>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="h-28 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />
      <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />)}</div>
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-900/5 dark:bg-white/5" />
    </div>
  );
}

function EmptyReports() {
  const { t } = useI18n();
  const { openReport } = useUi();
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-sm text-zinc-500">{t("profile.empty")}</p>
      <Button onClick={openReport}><Plus className="size-4" />{t("nav.report")}</Button>
    </div>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-zinc-900/5 p-1 dark:bg-white/10" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn("inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition",
            value === o.value ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch() {
  const { t } = useI18n();
  const dark = useIsDark();
  return (
    <Segmented
      options={[
        { value: "light", label: <><Sun className="size-4" />{t("profile.light")}</> },
        { value: "dark", label: <><Moon className="size-4" />{t("profile.dark")}</> },
      ]}
      value={dark ? "dark" : "light"}
      onChange={(v) => setTheme(v === "dark")}
    />
  );
}

/** Home / school point: picked on a map (or from GPS) and saved to the account. */
function PlaceEditor({ kind, icon, value, onSaved, onError }: {
  kind: "home" | "school"; icon: string; value: SavedPlace | null;
  onSaved: (u: PublicUser) => void; onError: (e: unknown) => string;
}) {
  const { t } = useI18n();
  const { toast } = useUi();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LatLng | null>(value ? [value.lat, value.lng] : null);
  const [flyTo, setFlyTo] = useState<{ pos: LatLng; key: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(place: SavedPlace | null) {
    setBusy(true);
    try {
      const d = await api<{ user: PublicUser }>("/api/me", jsonInit("PATCH", { [kind]: place }));
      onSaved(d.user);
      setEditing(false);
      toast(t("profile.saved"));
    } catch (e) {
      toast(onError(e), "err");
    } finally {
      setBusy(false);
    }
  }

  const label = (p: LatLng) => `${p[0].toFixed(5)}, ${p[1].toFixed(5)}`;

  return (
    <div className="rounded-2xl border border-zinc-900/10 p-3 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-900/5 text-lg dark:bg-white/10">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t(kind === "home" ? "route.home" : "route.school")}</span>
          <span className="block truncate text-xs tabular-nums text-zinc-500">{value ? value.label : t("profile.notSet")}</span>
        </span>
        <div className="flex gap-1.5">
          {value && !editing && (
            <Button size="sm" variant="ghost" className="h-11" disabled={busy} onClick={() => save(null)}>{t("profile.clear")}</Button>
          )}
          <Button size="sm" variant="outline" className="h-11" onClick={() => setEditing((e) => !e)}>
            <MapPinned className="size-4" />{value ? t("profile.change") : t("profile.pick")}
          </Button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 space-y-2">
          <div className="relative h-56 overflow-hidden rounded-xl">
            <MapView className="size-full" zoom={value ? 15 : 12} center={value ? [value.lat, value.lng] : undefined}
              picked={draft} flyTo={flyTo} onMapClick={setDraft} />
            <span className="glass pointer-events-none absolute inset-x-2 bottom-2 z-[500] mx-auto w-fit rounded-full px-3 py-1 text-xs font-medium tabular-nums">
              {draft ? label(draft) : t("profile.pickHint")}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={async () => {
              try { const p = await getPosition(); setDraft(p); setFlyTo({ pos: p, key: Date.now() }); } catch { toast(t("nearby.unavailable"), "err"); }
            }}>
              <Crosshair className="size-4" />{t("route.myLocation")}
            </Button>
            <Button type="button" className="h-11 flex-1" disabled={!draft || busy}
              onClick={() => draft && save({ lat: draft[0], lng: draft[1], label: label(draft) })}>
              {busy && <Loader2 className="size-4 animate-spin" />}{t("profile.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

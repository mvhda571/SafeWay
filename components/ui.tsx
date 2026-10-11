"use client";

import { forwardRef } from "react";
import { CarFront, CircleDot, Construction, Dog, HelpCircle, LightbulbOff, ShieldCheck, Search, Clock, TrafficCone, Crosshair, type LucideIcon } from "lucide-react";
import type { Category, Severity, Status } from "@/lib/types";
import { SEVERITY_COLOR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "./providers";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  open_manhole: CircleDot,
  unlit_street: LightbulbOff,
  stray_dogs: Dog,
  speeding: CarFront,
  no_crossing: Crosshair,
  construction: Construction,
  broken_light: TrafficCone,
  other: HelpCircle,
};

export const STATUS_ICON: Record<Status, LucideIcon> = {
  active: Clock,
  investigating: Search,
  resolved: ShieldCheck,
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        // Phones get 44 px touch targets; desktop keeps the compact sizes.
        size === "sm" && "h-11 px-3 text-xs md:h-8",
        size === "md" && "h-11 px-4 text-sm md:h-10",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" && "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-600",
        variant === "ghost" && "text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-200 dark:hover:bg-white/10",
        variant === "outline" && "border border-zinc-900/10 bg-white/60 text-zinc-800 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10",
        variant === "danger" && "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400",
        className,
      )}
      {...props}
    />
  );
});

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        severity === "low" && "bg-yellow-400/15 text-yellow-700 dark:text-yellow-300",
        severity === "medium" && "bg-orange-500/15 text-orange-700 dark:text-orange-300",
        severity === "high" && "bg-red-500/15 text-red-700 ring-1 ring-red-500/40 dark:text-red-300",
        className,
      )}
    >
      <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[severity] }} />
      {t(`sev.${severity}`)}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n();
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "active" && "bg-zinc-900/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
        status === "investigating" && "bg-sky-500/15 text-sky-700 dark:text-sky-300",
        status === "resolved" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      )}
    >
      <Icon className="size-3" />
      {t(`status.${status}`)}
    </span>
  );
}

export function CategoryChip({ category }: { category: Category }) {
  const { t } = useI18n();
  const Icon = CATEGORY_ICON[category];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      <Icon className="size-3.5" />
      {t(`cat.${category}`)}
    </span>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-2xl shadow-[0_8px_30px_-12px_rgb(0_0_0/0.18)]", className)} {...props} />;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-zinc-900/10 bg-white/70 px-3.5 py-2.5 text-base outline-none md:text-sm transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/10 dark:bg-zinc-900/60";

"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SEVERITY_COLOR, type Severity, type Status } from "@/lib/types";
import { STATUS_ICON } from "@/components/ui";
import { useI18n } from "@/components/providers";
import { useIsDark } from "@/components/theme";

function chrome(dark: boolean) {
  return {
    series: dark ? "#3987e5" : "#2a78d6",
    grid: dark ? "#2c2c2a" : "#e1e0d9",
    muted: "#898781",
    surface: dark ? "#1a1a19" : "#fcfcfb",
    ink: dark ? "#ffffff" : "#0b0b0b",
  };
}

function TooltipBox({ active, payload, label, suffix }: { active?: boolean; payload?: { value: number }[]; label?: string; suffix: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-500">{label}</p>
      <p className="font-bold tabular-nums">{payload[0].value} {suffix}</p>
    </div>
  );
}

export function CategoryBars({ data }: { data: { label: string; count: number }[] }) {
  const c = chrome(useIsDark());
  const { t } = useI18n();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -20, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.grid }} tick={{ fill: c.muted, fontSize: 11 }} interval={0} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11 }} />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} content={<TooltipBox suffix={t("admin.reports")} />} />
        <Bar dataKey="count" fill={c.series} radius={[4, 4, 0, 0]} label={{ position: "top", fill: c.ink, fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyArea({ data }: { data: { date: string; count: number }[] }) {
  const c = chrome(useIsDark());
  const { t } = useI18n();
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5).replace("-", ".") }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={rows} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.series} stopOpacity={0.3} />
            <stop offset="100%" stopColor={c.series} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.grid }} tick={{ fill: c.muted, fontSize: 11 }} minTickGap={16} />
        <YAxis allowDecimals={false} domain={[0, "auto"]} tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11 }} />
        <Tooltip cursor={{ stroke: c.muted, strokeDasharray: "3 3" }} content={<TooltipBox suffix={t("admin.reports")} />} />
        <Area type="monotone" dataKey="count" stroke={c.series} strokeWidth={2} fill="url(#dailyFill)"
          activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const STATUS_COLOR: Record<Status, string> = { active: "#d03b3b", investigating: "#fab219", resolved: "#0ca30c" };

/** 100% stacked bar — status colours always paired with icon + label. */
export function StatusStack({ data }: { data: { key: Status; count: number }[] }) {
  const { t } = useI18n();
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="space-y-4">
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full">
        {data.filter((d) => d.count > 0).map((d) => (
          <div
            key={d.key}
            title={`${t(`status.${d.key}`)}: ${d.count}`}
            className="h-full transition-all first:rounded-l-full last:rounded-r-full hover:brightness-110"
            style={{ width: `${(d.count / total) * 100}%`, background: STATUS_COLOR[d.key] }}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {data.map((d) => {
          const Icon = STATUS_ICON[d.key];
          return (
            <li key={d.key} className="flex items-center gap-2 text-sm">
              <span className="grid size-6 place-items-center rounded-lg text-white" style={{ background: STATUS_COLOR[d.key] }}>
                <Icon className="size-3.5" />
              </span>
              <span className="flex-1">{t(`status.${d.key}`)}</span>
              <span className="font-bold tabular-nums">{d.count}</span>
              <span className="w-10 text-right text-xs tabular-nums text-zinc-500">{Math.round((d.count / total) * 100)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Severity share — same layout as StatusStack, colour dot + label for every row. */
export function SeverityStack({ data }: { data: { key: Severity; count: number }[] }) {
  const { t } = useI18n();
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="space-y-4">
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full">
        {data.filter((d) => d.count > 0).map((d) => (
          <div
            key={d.key}
            title={`${t(`sev.${d.key}`)}: ${d.count}`}
            className="h-full transition-all first:rounded-l-full last:rounded-r-full hover:brightness-110"
            style={{ width: `${(d.count / total) * 100}%`, background: SEVERITY_COLOR[d.key] }}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-sm">
            <span className="size-3.5 rounded-full" style={{ background: SEVERITY_COLOR[d.key] }} />
            <span className="flex-1">{t(`sev.${d.key}`)}</span>
            <span className="font-bold tabular-nums">{d.count}</span>
            <span className="w-10 text-right text-xs tabular-nums text-zinc-500">{Math.round((d.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

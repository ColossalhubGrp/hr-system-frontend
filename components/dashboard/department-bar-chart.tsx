"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DepartmentSlice } from "@/lib/frappe/queries";
import { useTheme } from "@/components/theme/theme-provider";
import {
  CHART_NAVY,
  CHART_TICK_LIGHT,
  CHART_TICK_DARK,
} from "./chart-theme";

/**
 * Vertical bars, one per top-6 department. Labels are shortened
 * (we strip the "- CompanyName" suffix Frappe appends to every
 * department record) and rotated -40° so long names still fit
 * without overlapping. The chart is theme-aware: the brand navy
 * bar reads on both grounds, the axis tick colour flips.
 */
export function DepartmentBarChart({ data }: { data: DepartmentSlice[] }) {
  const { effective } = useTheme();
  const tick = effective === "dark" ? CHART_TICK_DARK : CHART_TICK_LIGHT;

  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        No department data yet.
      </div>
    );
  }

  const shaped = data.map((d) => ({
    ...d,
    short: shortName(d.department),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={shaped} margin={{ top: 24, right: 8, bottom: 8, left: 4 }}>
        <XAxis
          dataKey="short"
          tickLine={false}
          axisLine={false}
          tick={{ fill: tick, fontSize: 11 }}
          interval={0}
          angle={-35}
          height={64}
          dy={6}
          textAnchor="end"
        />
        <YAxis hide domain={[0, "dataMax + 10"]} />
        <Tooltip
          cursor={{ fill: "rgba(32, 48, 96, 0.08)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgb(var(--hairline))",
            background: "rgb(var(--surface))",
            color: "rgb(var(--ash-900))",
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v}%`, "Share"]}
          labelFormatter={(_l, p) =>
            (p as Array<{ payload?: DepartmentSlice }>)?.[0]?.payload?.department ?? ""
          }
        />
        <Bar dataKey="percentage" radius={[8, 8, 4, 4]} maxBarSize={48}>
          {shaped.map((_, i) => (
            <Cell key={i} fill={CHART_NAVY} />
          ))}
          <LabelList
            dataKey="percentage"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fill: tick, fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** "Warehouse - Rivers Inc" → "Warehouse"; "Sales" → "Sales". */
function shortName(full: string): string {
  const dash = full.lastIndexOf(" - ");
  const base = dash > 0 ? full.slice(0, dash) : full;
  return base.length > 16 ? base.slice(0, 14) + "…" : base;
}

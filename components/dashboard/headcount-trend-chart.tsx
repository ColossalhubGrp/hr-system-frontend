"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KpiPoint } from "@/lib/frappe/queries";
import { useTheme } from "@/components/theme/theme-provider";
import {
  CHART_NAVY,
  CHART_TICK_DARK,
  CHART_TICK_LIGHT,
  CHART_GRID_DARK,
  CHART_GRID_LIGHT,
} from "./chart-theme";

/**
 * 12-month end-of-month headcount — tells the growth story at a
 * glance. Area fill tapers from brand navy at 24% opacity down to
 * 0 so it reads as "trend direction" rather than a solid block.
 */
export function HeadcountTrendChart({ data }: { data: KpiPoint[] }) {
  const { effective } = useTheme();
  const tick = effective === "dark" ? CHART_TICK_DARK : CHART_TICK_LIGHT;
  const grid = effective === "dark" ? CHART_GRID_DARK : CHART_GRID_LIGHT;

  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        No trend data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="hc-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_NAVY} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART_NAVY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: tick, fontSize: 11 }}
          interval={1}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: tick, fontSize: 11 }}
          width={28}
        />
        <Tooltip
          cursor={{ stroke: tick, strokeDasharray: "2 4" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgb(var(--hairline))",
            background: "rgb(var(--surface))",
            color: "rgb(var(--ash-900))",
            fontSize: 12,
          }}
          formatter={(v: number) => [v.toLocaleString("en"), "Headcount"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_NAVY}
          strokeWidth={2}
          fill="url(#hc-trend)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

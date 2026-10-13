"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FlowPoint } from "@/lib/frappe/queries";
import { useTheme } from "@/components/theme/theme-provider";
import {
  CHART_MINT,
  CHART_RED,
  CHART_TICK_DARK,
  CHART_TICK_LIGHT,
  CHART_GRID_DARK,
  CHART_GRID_LIGHT,
} from "./chart-theme";

/**
 * Grouped vertical bars: hires (mint) vs separations (red) per
 * month for the last 12 months. The pulse of the workforce —
 * tells you at a glance when net growth stalled or spiked.
 */
export function FlowChart({ data }: { data: FlowPoint[] }) {
  const { effective } = useTheme();
  const tick = effective === "dark" ? CHART_TICK_DARK : CHART_TICK_LIGHT;
  const grid = effective === "dark" ? CHART_GRID_DARK : CHART_GRID_LIGHT;

  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        No hire / separation data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 4 }}>
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
          width={24}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(32, 48, 96, 0.06)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgb(var(--hairline))",
            background: "rgb(var(--surface))",
            color: "rgb(var(--ash-900))",
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: tick }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="hires" name="Hires" fill={CHART_MINT} radius={[6, 6, 2, 2]} maxBarSize={16} />
        <Bar dataKey="separations" name="Separations" fill={CHART_RED} radius={[6, 6, 2, 2]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

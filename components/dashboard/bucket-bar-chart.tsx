"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BucketPoint } from "@/lib/frappe/queries";
import { useTheme } from "@/components/theme/theme-provider";
import {
  CHART_NAVY,
  CHART_TICK_DARK,
  CHART_TICK_LIGHT,
  CHART_GRID_DARK,
  CHART_GRID_LIGHT,
} from "./chart-theme";

/**
 * Reusable vertical-bar chart for pre-bucketed series — Age bands,
 * Tenure bands, anything else where the X axis is a short set of
 * fixed labels. Keeps labels horizontal (buckets are already
 * short) so no rotation + no cut-off risk.
 */
export function BucketBarChart({
  data,
  valueLabel = "Employees",
  emptyMessage = "No data yet.",
}: {
  data: BucketPoint[];
  valueLabel?: string;
  emptyMessage?: string;
}) {
  const { effective } = useTheme();
  const tick = effective === "dark" ? CHART_TICK_DARK : CHART_TICK_LIGHT;
  const grid = effective === "dark" ? CHART_GRID_DARK : CHART_GRID_LIGHT;

  const total = data.reduce((a, p) => a + p.count, 0);
  if (total === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 24, right: 8, bottom: 8, left: 4 }}>
        <CartesianGrid stroke={grid} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: tick, fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: tick, fontSize: 11 }}
          width={28}
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
          formatter={(v: number) => [v.toLocaleString("en"), valueLabel]}
        />
        <Bar dataKey="count" fill={CHART_NAVY} radius={[6, 6, 2, 2]} maxBarSize={48}>
          <LabelList
            dataKey="count"
            position="top"
            style={{ fill: tick, fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

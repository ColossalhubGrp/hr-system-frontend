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
import { useTheme } from "@/components/theme/theme-provider";
import {
  CHART_NAVY,
  CHART_MINT,
  CHART_RED,
  CHART_TICK_DARK,
  CHART_TICK_LIGHT,
} from "./chart-theme";

/**
 * The headcount-math waterfall — "HR's killer visual" per the product
 * owner's Storytelling-with-Data brief: opening headcount, + hires,
 * − exits, closing headcount. Floating middle bars are drawn with a
 * transparent stacked base; every bar carries its own value label and
 * there is no number axis.
 */
export function HeadcountWaterfall({
  headcount,
  hires,
  separations,
}: {
  /** Current (closing) headcount. */
  headcount: number;
  hires: number;
  separations: number;
}) {
  const { effective } = useTheme();
  const tick = effective === "dark" ? CHART_TICK_DARK : CHART_TICK_LIGHT;

  // Reconcile backwards so the maths always closes exactly.
  const start = headcount - hires + separations;
  const afterHires = start + hires;

  const data = [
    { label: "A year ago", base: 0, delta: start, display: String(start), fill: CHART_NAVY },
    { label: "Hires", base: start, delta: hires, display: `+${hires}`, fill: CHART_MINT },
    { label: "Exits", base: afterHires - separations, delta: separations, display: `−${separations}`, fill: CHART_RED },
    { label: "Today", base: 0, delta: headcount, display: String(headcount), fill: CHART_NAVY },
  ];

  if (hires === 0 && separations === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        No joiners or leavers in the last 12 months.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, bottom: 4, left: 8 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: tick, fontSize: 11 }}
          interval={0}
        />
        {/* No y-axis — every bar carries its own value label. */}
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(32, 48, 96, 0.06)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgb(var(--hairline))",
            background: "rgb(var(--surface))",
            color: "rgb(var(--ash-900))",
            fontSize: 12,
          }}
          formatter={(v: number, name: string) =>
            name === "delta" ? [v.toLocaleString("en"), "Employees"] : []
          }
          labelFormatter={(l) => String(l)}
        />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="delta" stackId="w" radius={[4, 4, 0, 0]} maxBarSize={44}>
          {data.map((row, i) => (
            <Cell key={i} fill={row.fill} />
          ))}
          <LabelList
            dataKey="display"
            position="top"
            style={{ fill: tick, fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

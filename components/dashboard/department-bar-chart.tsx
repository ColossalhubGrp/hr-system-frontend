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
 * Horizontal bars (recharts' `layout="vertical"` idiom), one row
 * per top-6 department. Each department label sits on its OWN
 * line to the left of its bar, so there's no label crowding or
 * clipping no matter how long the department name is. The
 * percentage prints at the end of each bar.
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

  // Give the longest label the room it needs; recharts' YAxis
  // `width` is literal pixels and doesn't auto-measure. Labels
  // wrap onto two lines, so the width only has to fit the longest
  // single line after wrapping — long names never get clipped.
  const longestLineChars = shaped.reduce(
    (m, r) => Math.max(m, ...wrapLabel(r.short).map((l) => l.length)),
    0,
  );
  const yWidth = Math.max(64, Math.round(longestLineChars * 6.6) + 12);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={shaped}
        layout="vertical"
        margin={{ top: 8, right: 36, bottom: 4, left: 4 }}
      >
        <XAxis
          type="number"
          hide
          domain={[0, "dataMax + 6"]}
        />
        <YAxis
          dataKey="short"
          type="category"
          tickLine={false}
          axisLine={false}
          tick={<WrapTick fill={tick} />}
          width={yWidth}
          interval={0}
        />
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
        <Bar dataKey="percentage" radius={[4, 8, 8, 4]} barSize={18}>
          {shaped.map((_, i) => (
            <Cell key={i} fill={CHART_NAVY} />
          ))}
          <LabelList
            dataKey="percentage"
            position="right"
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
  return dash > 0 ? full.slice(0, dash) : full;
}

/**
 * Pack words into at most two lines of ~14 characters each. A name
 * that still overflows keeps everything on line two rather than
 * dropping words, and yWidth above is measured off the longest
 * wrapped line — so the full label always renders.
 */
function wrapLabel(label: string, maxChars = 14): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(/\s+/);
  if (words.length === 1) return [label];
  let first = "";
  let i = 0;
  while (i < words.length) {
    const next = first ? `${first} ${words[i]}` : words[i];
    if (first && next.length > maxChars) break;
    first = next;
    i += 1;
  }
  const rest = words.slice(i).join(" ");
  return rest ? [first, rest] : [first];
}

/** Two-line category tick for the Y axis — recharts' default tick
 *  renders a single <text> line and truncates nothing gracefully. */
function WrapTick({
  x,
  y,
  payload,
  fill,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  fill?: string;
}) {
  const lines = wrapLabel(String(payload?.value ?? ""));
  const firstDy = lines.length > 1 ? -2 : 4;
  return (
    <text x={x} y={y} textAnchor="end" fill={fill} fontSize={11}>
      {lines.map((line, idx) => (
        <tspan key={idx} x={x} dy={idx === 0 ? firstDy : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

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
 * Vertical bars, one per top-6 department.
 *
 * Labels sit HORIZONTAL (no rotation) and wrap on whitespace into
 * up to two lines, so two-word labels like "Customer Service" show
 * fully instead of being clipped by angled-tick overflow. If a
 * single word is longer than 11 chars we truncate with "…" to
 * avoid colliding with the neighbour bar.
 *
 * The full name (incl. company suffix) is always available in the
 * tooltip, so no information is lost on hover either.
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
      <BarChart data={shaped} margin={{ top: 24, right: 8, bottom: 4, left: 4 }}>
        <XAxis
          dataKey="short"
          tickLine={false}
          axisLine={false}
          interval={0}
          height={44}
          tick={<WrappedTick fill={tick} />}
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

/**
 * Multi-line SVG tick. Splits the label into words and lays each
 * on its own line, up to 2 lines; anything over 11 chars inside
 * a single word gets truncated with "…".
 */
function WrappedTick({
  x,
  y,
  payload,
  fill,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  fill: string;
}) {
  const raw = payload?.value ?? "";
  const words = raw.split(" ").filter(Boolean);
  const lines = (
    words.length === 1 ? [truncate(words[0], 11)] : words.slice(0, 2).map((w) => truncate(w, 11))
  );
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={14 + i * 13}
          textAnchor="middle"
          fill={fill}
          fontSize={11}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** "Warehouse - Rivers Inc" → "Warehouse"; "Sales" → "Sales". */
function shortName(full: string): string {
  const dash = full.lastIndexOf(" - ");
  return dash > 0 ? full.slice(0, dash) : full;
}

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { GenderSlice } from "@/lib/frappe/queries";

// Brand-aligned palette (navy → ink-500 → ink-300 → mint-400).
// Same colours in both themes so the donut reads consistently
// on light + dark grounds.
const PALETTE = ["#203060", "#4C5F8E", "#9AA6C4", "#88D0B8"];

export function GenderDonut({ data }: { data: GenderSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        No gender data yet.
      </div>
    );
  }

  return (
    <div className="flex h-full items-center gap-6">
      <div className="relative h-full w-[60%]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgb(var(--hairline))",
                background: "rgb(var(--surface))",
                color: "rgb(var(--ash-900))",
                fontSize: 12,
              }}
              formatter={(v: number, n: string) => [`${v}%`, n]}
            />
            <Pie
              data={data}
              dataKey="percentage"
              nameKey="label"
              innerRadius="60%"
              outerRadius="92%"
              paddingAngle={1}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={PALETTE[i % PALETTE.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {data[0] && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-2xl font-semibold text-ash-900">
                {data[0].percentage}%
              </div>
              <div className="text-[11px] text-ash-500">{data[0].label}</div>
            </div>
          </div>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-2.5">
        {data.map((slice, i) => (
          <li key={slice.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: PALETTE[i % PALETTE.length] }}
              aria-hidden
            />
            <span className="text-ash-700">{slice.label}</span>
            <span className="ml-auto text-xs text-ash-500">
              {slice.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

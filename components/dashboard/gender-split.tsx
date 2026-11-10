/**
 * Gender split as the Storytelling-with-Data "simple-text makeover":
 * two numbers don't need a donut (the brief retires donuts outright) —
 * the numbers ARE the headline, with one thin proportion strip for
 * shape. Server-safe: no chart library.
 */

import type { GenderSlice } from "@/lib/frappe/queries";

const COLORS = ["#203060", "#88D0B8", "#9AA6C4", "#4C5F8E"];

export function GenderSplit({ data }: { data: GenderSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        No gender data yet.
      </div>
    );
  }
  const slices = [...data].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="flex flex-wrap items-end gap-10">
        {slices.map((s, i) => (
          <div key={s.label}>
            <div
              className="text-4xl font-extrabold tabular-nums tracking-tight"
              style={{ color: COLORS[i % COLORS.length] }}
            >
              {s.percentage}%
            </div>
            <div className="mt-1 text-sm text-ash-600">{s.label}</div>
          </div>
        ))}
      </div>
      {/* One thin strip for proportion — context, not decoration. */}
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {slices.map((s, i) => (
          <div
            key={s.label}
            style={{
              width: `${s.percentage}%`,
              background: COLORS[i % COLORS.length],
            }}
          />
        ))}
      </div>
    </div>
  );
}

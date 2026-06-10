"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

type Direction = "up" | "down" | "flat";

/**
 * Tiny sparkline used inside KPI cards. Colour follows the trend direction.
 * Recharts is overkill for 6 points but keeps a single chart library across the
 * dashboard — fewer animation styles to harmonise.
 */
export function TrendSparkline({
  series,
  direction,
  className,
}: {
  series: { label: string; value: number }[];
  direction: Direction;
  className?: string;
}) {
  if (series.length === 0) return null;

  const stroke =
    direction === "down" ? "#EF4444" : direction === "flat" ? "#9CA3AF" : "#22C55E";

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${direction}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.75}
            fill={`url(#spark-${direction})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

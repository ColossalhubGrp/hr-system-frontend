import { MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { TrendSparkline } from "./trend-sparkline";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  trendPct: number | null;
  /** Treat a missing value (—) as flat. */
  trendDirection?: "up" | "down" | "flat";
  caption?: string;
  spark?: { label: string; value: number }[];
};

/**
 * KPI cell matching the mockup. Big number, label above, trend pill below with
 * a sparkline in the corner. The trend pill colour follows the *direction*, not
 * the sign — for "Staff Cost to Income" a fall is good (down + green).
 */
export function KpiCard({
  label,
  value,
  trendPct,
  trendDirection,
  caption = "Since last month",
  spark = [],
}: Props) {
  const direction =
    trendDirection ??
    (trendPct === null
      ? "flat"
      : trendPct > 0
      ? "up"
      : trendPct < 0
      ? "down"
      : "flat");

  const trendClass =
    direction === "up"
      ? "text-rise"
      : direction === "down"
      ? "text-fall"
      : "text-ash-500";

  return (
    <div className="card relative flex flex-col gap-4 px-5 py-4">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ash-500">{label}</p>
        <button
          type="button"
          className="rounded-md p-1 text-ash-400 hover:bg-canvas focus-ring"
          aria-label="More"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-kpi text-ash-900">{value}</div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                trendClass,
              )}
            >
              {direction === "up" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : direction === "down" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : null}
              {trendPct === null
                ? "—"
                : `${trendPct > 0 ? "+" : ""}${trendPct}%`}
            </span>
            <span className="text-ash-500">{caption}</span>
          </div>
        </div>

        {spark.length > 0 && (
          <TrendSparkline
            series={spark}
            direction={direction}
            className="h-10 w-24"
          />
        )}
      </div>
    </div>
  );
}

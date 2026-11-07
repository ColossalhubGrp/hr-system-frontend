import Link from "next/link";
import type { Route } from "next";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TrendSparkline } from "./trend-sparkline";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  trendPct: number | null;
  /** Treat a missing value (—) as flat. */
  trendDirection?: "up" | "down" | "flat";
  caption?: string;
  /** Replaces the trend pill entirely with plain words — "up 14 on
   *  October" says more than "+1.9%". */
  delta?: string;
  /** Provenance line in the footer — where the number comes from. */
  footnote?: string;
  /** Makes the whole card a drill-through to the records behind it. */
  href?: string;
  spark?: { label: string; value: number }[];
};

/**
 * KPI cell. Big number, label above, trend below, sparkline in the
 * corner. The trend colour follows the *direction*, not the sign —
 * for "Staff Cost to Income" a fall is good (down + green). With an
 * `href` the card is a link into the filtered list it summarises.
 */
export function KpiCard({
  label,
  value,
  trendPct,
  trendDirection,
  caption = "Since last month",
  delta,
  footnote,
  href,
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

  const body = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ash-500">{label}</p>
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
              {delta ??
                (trendPct === null
                  ? "—"
                  : `${trendPct > 0 ? "+" : ""}${trendPct}%`)}
            </span>
            {!delta && <span className="text-ash-500">{caption}</span>}
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

      {footnote && (
        <p className="text-[11px] leading-snug text-ash-400">{footnote}</p>
      )}
    </>
  );

  const className = cn(
    "card relative flex flex-col gap-3 px-5 py-4",
    href && "transition hover:border-ink-300 hover:shadow-sm",
  );

  if (href) {
    return (
      <Link href={href as Route} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

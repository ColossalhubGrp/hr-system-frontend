import { CalendarClock, MinusCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The tiny storytelling strip that sits between an answer's header and
 * its chart — cites the queried window and (when the compare pass ran)
 * flags whether the number moved materially. Two shared readers use it:
 * the dashboard tile and the public share view. Keeping it in one file
 * so the two surfaces don't drift.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ 📅 Jan 2026 → Sep 2026   • no material change vs prior      │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Nothing renders when both dateRange and stability are absent.
 */
export function AnswerContext({
  dateRange,
  stability,
  className,
}: {
  dateRange: { start: string; end: string } | null;
  stability: "stable" | "material_change" | "unknown" | null | undefined;
  className?: string;
}) {
  const rangeLabel = _formatRange(dateRange);
  const stabilityLabel = _stabilityLabel(stability);
  if (!rangeLabel && !stabilityLabel) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {rangeLabel && (
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3 w-3" />
          {rangeLabel}
        </span>
      )}
      {stabilityLabel && (
        <StabilityPill stability={stability ?? "unknown"}>
          {stabilityLabel}
        </StabilityPill>
      )}
    </div>
  );
}

function StabilityPill({
  stability,
  children,
}: {
  stability: "stable" | "material_change" | "unknown";
  children: React.ReactNode;
}) {
  if (stability === "stable") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
        <MinusCircle className="h-2.5 w-2.5" />
        {children}
      </span>
    );
  }
  if (stability === "material_change") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
        <TrendingUp className="h-2.5 w-2.5" />
        {children}
      </span>
    );
  }
  return null;
}

function _formatRange(
  range: { start: string; end: string } | null,
): string | null {
  if (!range) return null;
  const start = _formatDay(range.start);
  const end = _formatDay(range.end);
  if (!start || !end) return null;
  if (start === end) return start;
  return `${start} → ${end}`;
}

function _formatDay(iso: string): string | null {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function _stabilityLabel(
  stability: "stable" | "material_change" | "unknown" | null | undefined,
): string | null {
  if (stability === "stable") return "No material change vs prior period";
  if (stability === "material_change") return "Material change vs prior period";
  return null;
}

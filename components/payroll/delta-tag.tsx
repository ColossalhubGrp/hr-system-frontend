/**
 * "vs previous" comparison badge — shows how a figure moved against
 * the prior pay run. ▲ green for up, ▼ rose for down. Direction only.
 */
export function DeltaTag({
  current,
  previous,
  fmt,
  withPercent = false,
  compact = false,
}: {
  current: number;
  previous: number | undefined | null;
  fmt: (n: number) => string;
  withPercent?: boolean;
  /** Compact mode = 9px font, no wrapping. Use when the tag sits
   *  stacked under an amount in a narrow table column so it reads
   *  as a subtitle, not a peer. */
  compact?: boolean;
}) {
  const sizeCls = compact
    ? "text-[9px] whitespace-nowrap"
    : "text-xs";
  if (previous === undefined || previous === null) {
    return <span className={`${sizeCls} font-medium text-muted-foreground`}>New</span>;
  }
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) {
    return <span className={`${sizeCls} font-medium text-muted-foreground`}>No change</span>;
  }
  const up = diff > 0;
  const pct = previous !== 0 ? (diff / previous) * 100 : null;
  return (
    <span className={`${sizeCls} font-semibold ${up ? "text-emerald-600" : "text-rose-500"}`}>
      {up ? "▲" : "▼"} {fmt(Math.abs(diff))}
      {withPercent && pct !== null ? ` (${Math.abs(pct).toFixed(1)}%)` : ""}
    </span>
  );
}

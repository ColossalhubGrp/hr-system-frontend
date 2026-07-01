/**
 * "vs previous" comparison badge — shows how a figure moved against
 * the prior pay run. ▲ green for up, ▼ rose for down. Direction only.
 */
export function DeltaTag({
  current,
  previous,
  fmt,
  withPercent = false,
}: {
  current: number;
  previous: number | undefined | null;
  fmt: (n: number) => string;
  withPercent?: boolean;
}) {
  if (previous === undefined || previous === null) {
    return <span className="text-xs font-medium text-muted-foreground">New</span>;
  }
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) {
    return <span className="text-xs font-medium text-muted-foreground">No change</span>;
  }
  const up = diff > 0;
  const pct = previous !== 0 ? (diff / previous) * 100 : null;
  return (
    <span className={`text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-500"}`}>
      {up ? "▲" : "▼"} {fmt(Math.abs(diff))}
      {withPercent && pct !== null ? ` (${Math.abs(pct).toFixed(1)}%)` : ""}
    </span>
  );
}

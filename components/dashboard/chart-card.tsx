/**
 * Common chrome for chart cards: title left, an optional meta line
 * right. The old decorative range dropdowns and overflow menu did
 * nothing and read as template — the meta slot now carries something
 * true instead (the data's scope or source).
 */
export function ChartCard({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex h-[290px] flex-col gap-4 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ash-900">{title}</h3>
        {meta && <span className="truncate text-[11px] text-ash-400">{meta}</span>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

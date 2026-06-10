import { MoreHorizontal } from "lucide-react";
import { RangePills } from "./range-pills";

/**
 * Common chrome for chart cards: title left, range pills + overflow menu right.
 */
export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex h-[290px] flex-col gap-4 px-5 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ash-900">{title}</h3>
        <div className="flex items-center gap-2">
          <RangePills />
          <button
            type="button"
            className="rounded-md p-1 text-ash-400 hover:bg-canvas focus-ring"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

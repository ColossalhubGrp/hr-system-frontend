import Link from "next/link";
import type { Route } from "next";
import { RecalibratePopover } from "./recalibrate-popover";
import type { NineBoxBoard } from "@/lib/frappe/calibration";
import { recalibrateAction } from "@/app/(workspace)/hr/performance/calibration/actions";

/**
 * Render a 3×3 9-box grid from a NineBoxBoard. Server Component — wraps each
 * chip in a Client RecalibratePopover so HR can adjust placement without
 * leaving the page.
 *
 * Layout convention: potential RUNS UP (top = High), performance RUNS RIGHT
 * (right = High). Cells in row-major order:
 *
 *     Lo-Hi   Med-Hi   Hi-Hi
 *     Lo-Med  Med-Med  Hi-Med
 *     Lo-Lo   Med-Lo   Hi-Lo
 *
 * `cells` from the lib comes in BANDS×BANDS order (Low→High × Low→High); we
 * reorder for display so Top-Right = highest perf & potential.
 */
export function NineBoxGrid({
  board,
  canEdit,
}: {
  board: NineBoxBoard;
  canEdit: boolean;
}) {
  // Build a 3x3 matrix indexed by [potentialRow][performanceCol] where
  // potentialRow 0 = High, 1 = Medium, 2 = Low (top to bottom)
  // performanceCol 0 = Low, 1 = Medium, 2 = High (left to right)
  const rows: Array<Array<NineBoxBoard["cells"][number]>> = [[], [], []];
  for (const cell of board.cells) {
    const pr =
      cell.potential === "High" ? 0 : cell.potential === "Medium" ? 1 : 2;
    rows[pr]!.push(cell);
  }
  for (const row of rows) {
    row.sort((a, b) => {
      const order = { Low: 0, Medium: 1, High: 2 } as const;
      return order[a.performance] - order[b.performance];
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Y-axis label */}
      <div className="flex gap-3">
        <YAxisLabel />
        <div className="flex flex-1 flex-col gap-3">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-3 gap-3">
              {row.map((cell) => (
                <Cell key={cell.id} cell={cell} canEdit={canEdit} />
              ))}
            </div>
          ))}
          <XAxisLabel />
        </div>
      </div>
    </div>
  );
}

function Cell({
  cell,
  canEdit,
}: {
  cell: NineBoxBoard["cells"][number];
  canEdit: boolean;
}) {
  // Visual tone: shade by perceived risk/opportunity. Top-right green, bottom
  // left red, gradients in between.
  const tone = toneFor(cell.performance, cell.potential);
  return (
    <section
      className={`flex min-h-[180px] flex-col rounded-card border p-3 shadow-card ${tone.border} ${tone.bg}`}
      aria-label={`${cell.label} — ${cell.performance} performance, ${cell.potential} potential`}
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-xs font-semibold ${tone.text}`}>
            {cell.label}
          </p>
          <p className="text-[10px] text-ash-500">
            {cell.performance} perf · {cell.potential} pot
          </p>
        </div>
        <span className="rounded-chip bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-800">
          {cell.entries.length}
        </span>
      </header>
      <p className="mb-2 text-[10px] leading-snug text-ash-600">{cell.hint}</p>
      <div className="flex flex-wrap gap-1">
        {cell.entries.length === 0 && (
          <span className="text-[11px] italic text-ash-400">empty</span>
        )}
        {cell.entries.map((e) => {
          // Read-only users see plain chips. Editors get the popover wrapper.
          if (!canEdit) {
            return (
              <span
                key={e.appraisalId}
                className="inline-flex items-center rounded-chip border border-hairline bg-surface px-2 py-1 text-[11px] font-medium text-ink-800"
                title={`${e.performance} performance · ${e.potential} potential`}
              >
                <span className="truncate max-w-[120px]">
                  {e.employeeName ?? e.employee}
                </span>
              </span>
            );
          }
          const action = recalibrateAction.bind(null, e.appraisalId);
          return (
            <RecalibratePopover
              key={e.appraisalId}
              action={action}
              appraisalId={e.appraisalId}
              employeeName={e.employeeName ?? e.employee}
              currentPotential={e.potential}
              performanceLabel={e.performance}
              finalScore={e.finalScore}
              canEdit={canEdit}
            />
          );
        })}
      </div>
      <div className="mt-auto pt-2">
        {cell.entries.length > 0 && (
          <Link
            href={
              `/hr/performance?cycle_filter=&potential=${cell.potential}` as Route
            }
            className="text-[10px] text-ash-500 underline-offset-2 hover:underline"
          >
            Inspect this cell
          </Link>
        )}
      </div>
    </section>
  );
}

function YAxisLabel() {
  return (
    <div className="flex w-8 shrink-0 items-center">
      <p
        className="-rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.2em] text-ash-500"
        aria-hidden
      >
        Potential ↑
      </p>
    </div>
  );
}

function XAxisLabel() {
  return (
    <p
      className="mt-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-ash-500"
      aria-hidden
    >
      Performance →
    </p>
  );
}

// Tone map: 9 cells, each with bg + border + text classes. Hand-tuned so the
// diagonal reads top-right green → centre warm → bottom-left red.
function toneFor(
  performance: "Low" | "Medium" | "High",
  potential: "Low" | "Medium" | "High",
): { bg: string; border: string; text: string } {
  const key = `${performance}-${potential}`;
  switch (key) {
    case "High-High":
    case "Medium-High":
    case "High-Medium":
      return {
        bg: "bg-rise/[0.08]",
        border: "border-rise/30",
        text: "text-rise",
      };
    case "Medium-Medium":
    case "Low-High":
    case "High-Low":
      return {
        bg: "bg-amber-50/70",
        border: "border-amber-300/40",
        text: "text-amber-800",
      };
    case "Medium-Low":
      return {
        bg: "bg-canvas/80",
        border: "border-hairline",
        text: "text-ink-800",
      };
    case "Low-Medium":
      return {
        bg: "bg-amber-50/40",
        border: "border-amber-200/50",
        text: "text-amber-700",
      };
    case "Low-Low":
    default:
      return {
        bg: "bg-fall/[0.06]",
        border: "border-fall/30",
        text: "text-fall",
      };
  }
}

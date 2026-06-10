import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./list-shell";

export type DataTableColumn<T> = {
  /** Header text or node. */
  header: React.ReactNode;
  /** Renders the cell for this column. */
  cell: (row: T, index: number) => React.ReactNode;
  /**
   * Tailwind classes added to both `<th>` and `<td>` for this column —
   * use for responsive hiding (`hidden md:table-cell`) and alignment
   * (`text-right`). Keeps header + body in lockstep.
   */
  className?: string;
};

export type DataTableProps<T> = {
  rows: ReadonlyArray<T>;
  columns: ReadonlyArray<DataTableColumn<T>>;
  /** Stable React key for each row. */
  rowKey: (row: T) => string;
  /**
   * When set, the table adds a trailing chevron column that links to this
   * URL per row. Rows themselves stay non-wrapped so cells can hold their
   * own links (e.g. an employee name linking to the employee page while the
   * row's chevron opens the leave / claim / appraisal detail).
   */
  rowHref?: (row: T) => string;
  /** Aria label for the chevron link. Defaults to `Open {rowKey}`. */
  rowAriaLabel?: (row: T) => string;
  /** Shown in place of the table when `rows` is empty. */
  empty?: React.ReactNode;
};

/**
 * Standard list-page table: rounded card frame, sticky header tones, hover
 * row background, optional trailing chevron column for row-open links.
 *
 * Generic over the row type, so the call site can keep its strongly-typed
 * row shape and just project columns from it.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  rowAriaLabel,
  empty,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState>{empty ?? "Nothing to show yet."}</EmptyState>;
  }

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
            {columns.map((c, i) => (
              <th key={i} className={cn("px-5 py-3", c.className)}>
                {c.header}
              </th>
            ))}
            {rowHref && <th className="px-2 py-3" aria-label="Open" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className="border-b border-hairline last:border-b-0 transition hover:bg-canvas/60"
              >
                {columns.map((c, ci) => (
                  <td key={ci} className={cn("px-5 py-3", c.className)}>
                    {c.cell(row, ri)}
                  </td>
                ))}
                {rowHref && (
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={rowHref(row) as Route}
                      aria-label={
                        rowAriaLabel ? rowAriaLabel(row) : `Open ${key}`
                      }
                      className="inline-grid h-8 w-8 place-items-center rounded-full text-ash-500 transition hover:bg-canvas focus-ring"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

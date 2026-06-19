import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./list-shell";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
   * URL per row.
   */
  rowHref?: (row: T) => string;
  /** Aria label for the chevron link. Defaults to `Open {rowKey}`. */
  rowAriaLabel?: (row: T) => string;
  /** Shown in place of the table when `rows` is empty. */
  empty?: React.ReactNode;
};

/**
 * Standard list-page table — rebased on shadcn's <Table> + <Card>.
 *
 * The wrapping <Card> gives us the bordered surface and subtle shadow;
 * the table itself uses shadcn's row/cell padding tokens. Column-level
 * className still propagates to both <th> and <td> so callers can keep
 * their responsive hiding rules.
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
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c, i) => (
              <TableHead key={i} className={cn("px-5 py-3 text-xs uppercase tracking-wide", c.className)}>
                {c.header}
              </TableHead>
            ))}
            {rowHref && <TableHead className="px-2 py-3" aria-label="Open" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => {
            const key = rowKey(row);
            return (
              <TableRow key={key}>
                {columns.map((c, ci) => (
                  <TableCell key={ci} className={cn("px-5 py-3", c.className)}>
                    {c.cell(row, ri)}
                  </TableCell>
                ))}
                {rowHref && (
                  <TableCell className="px-2 py-3 text-right">
                    <Link
                      href={rowHref(row) as Route}
                      aria-label={
                        rowAriaLabel ? rowAriaLabel(row) : `Open ${key}`
                      }
                      className="inline-grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-accent focus-ring"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

import Link from "next/link";
import type { Route } from "next";

/**
 * The "name + employee ID" stacked cell used in every list table that joins
 * on employees.
 *
 * By default the cell links to the Employee app's detail page. Pass
 * `noLink` when the surrounding row already navigates elsewhere (e.g.
 * a lifecycle list where clicking the row should open the lifecycle
 * record's detail page, not the employee profile) — otherwise the
 * embedded Link swallows the click and hijacks the destination.
 */
export function EmployeeCell({
  id,
  name,
  noLink,
}: {
  id: string;
  name?: string | null;
  /** Render as plain text so the parent row's click / href drives
   *  navigation. Default: false → links to /employee/<id>. */
  noLink?: boolean;
}) {
  const label = name ?? id;
  if (noLink) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-ash-900">{label}</span>
        <span className="text-xs text-ash-500">{id}</span>
      </div>
    );
  }
  return (
    <Link
      href={`/employee/${encodeURIComponent(id)}` as Route}
      className="flex flex-col gap-0.5 focus-ring rounded-xl"
    >
      <span className="font-medium text-ash-900">{label}</span>
      <span className="text-xs text-ash-500">{id}</span>
    </Link>
  );
}

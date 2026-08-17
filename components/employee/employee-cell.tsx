import Link from "next/link";
import type { Route } from "next";

/**
 * The "name + employee ID" stacked cell used in every list table that
 * joins on employees.
 *
 * By default the cell links to the Employee app's detail page. Callers
 * that want the row-level context (e.g. a lifecycle list where the row
 * points at the specific record, not the employee profile) can pass
 * `linkTo` to redirect the click to their preferred destination — the
 * cell still renders as a link so the affordance is preserved.
 *
 * Pass `noLink` to render as plain text (rare — mainly for cases
 * where the whole surrounding row is a clickable link and a nested
 * anchor would be invalid HTML).
 */
export function EmployeeCell({
  id,
  name,
  linkTo,
  noLink,
}: {
  id: string;
  name?: string | null;
  /** Override the destination URL. Default: `/employee/<id>`. */
  linkTo?: string;
  /** Render as plain text (no link at all). Default: false. */
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
  const href = linkTo ?? `/employee/${encodeURIComponent(id)}`;
  return (
    <Link
      href={href as Route}
      className="flex flex-col gap-0.5 focus-ring rounded-xl"
    >
      <span className="font-medium text-ash-900">{label}</span>
      <span className="text-xs text-ash-500">{id}</span>
    </Link>
  );
}

import Link from "next/link";
import type { Route } from "next";

/**
 * The "name + employee ID" stacked cell used in every list table that joins
 * on employees. Always links to the Employee app's detail page.
 */
export function EmployeeCell({
  id,
  name,
}: {
  id: string;
  name?: string | null;
}) {
  return (
    <Link
      href={`/employee/${encodeURIComponent(id)}` as Route}
      className="flex flex-col gap-0.5 focus-ring rounded-xl"
    >
      <span className="font-medium text-ash-900">{name ?? id}</span>
      <span className="text-xs text-ash-500">{id}</span>
    </Link>
  );
}

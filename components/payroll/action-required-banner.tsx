import Link from "next/link";
import type { Route } from "next";

export type MissingItem = {
  employee: string;
  employee_name: string;
  missing: string[];
};

/**
 * "Action Required" gate — employees missing statutory info that
 * blocks them from being paid. Renders nothing if there's nothing
 * to flag.
 */
export function ActionRequiredBanner({ items }: { items: MissingItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-center gap-2 font-bold text-rose-800">
        ⚠ Action Required
      </div>
      <p className="mt-1 text-sm text-rose-700">
        {items.length} employee{items.length > 1 ? "s are" : " is"} missing
        key information needed to run payroll. They will be{" "}
        <strong>excluded</strong> from pay runs until it&apos;s provided.
      </p>
      <div className="mt-3 space-y-1">
        {items.map((e) => (
          <div key={e.employee} className="flex items-center gap-2 text-sm">
            <span className="text-rose-600">●</span>
            <Link
              href={`/employee/${encodeURIComponent(e.employee)}` as Route}
              className="font-semibold text-rose-800 hover:underline"
            >
              {e.employee_name}
            </Link>
            <span className="text-rose-600">— missing {e.missing.join(", ")}</span>
            <Link
              href={`/employee/${encodeURIComponent(e.employee)}` as Route}
              className="ml-auto text-xs font-semibold text-rose-700 hover:underline"
            >
              Fix now →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

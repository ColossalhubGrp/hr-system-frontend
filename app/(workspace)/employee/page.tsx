import { Suspense } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Users, Plus } from "lucide-react";
import { DirectoryFilters } from "@/components/employee/directory-filters";
import { DirectoryTable } from "@/components/employee/directory-table";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  fetchDirectoryFacets,
  listEmployees,
} from "@/lib/frappe/employees";
import { requireGroup } from "@/lib/frappe/require-role";

export const metadata = {
  title: "Employees · Colossal HR",
};

type SP = {
  q?: string;
  department?: string;
  status?: string;
  page?: string;
};

export default async function EmployeeDirectoryPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  // Directory shows every employee — HR roles only. Pure employees use
  // /me for their own profile.
  await requireGroup("HR_ANY", "/employee");
  const page = Number(searchParams.page ?? 1) || 1;
  const pageSize = 25;

  // Filters render synchronously; the table streams in. Failures on either
  // side degrade independently: an empty facet list still lets you search.
  const facetsPromise = fetchDirectoryFacets();
  const listPromise = listEmployees({
    q: searchParams.q?.trim() || undefined,
    department: searchParams.department || undefined,
    status: searchParams.status || undefined,
    page,
    pageSize,
  });

  const [facetsSettled, listSettled] = await Promise.allSettled([
    facetsPromise,
    listPromise,
  ]);

  const facets =
    facetsSettled.status === "fulfilled"
      ? facetsSettled.value
      : { departments: [], statuses: ["Active", "Inactive", "Suspended", "Left"] };
  const list =
    listSettled.status === "fulfilled"
      ? listSettled.value
      : { rows: [], total: 0, page, pageSize };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <Users className="h-3.5 w-3.5" />
            Employee · Directory
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Employees
          </h1>
          <p className="text-sm text-ash-600">
            {list.total.toLocaleString()} on the roster.
          </p>
        </div>
        <Link
          href={"/employee/new" as Route}
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
        >
          <Plus className="h-4 w-4" />
          New employee
        </Link>
      </header>

      <DirectoryFilters
        departments={facets.departments}
        statuses={facets.statuses}
      />

      <Suspense fallback={null}>
        <DirectoryTable rows={list.rows} />
      </Suspense>

      <DirectoryPagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
      />

      {listSettled.status === "rejected" && (
        <p className="rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall">
          We couldn't load the directory just now. Refresh, or check that your
          Frappe credentials are valid.
        </p>
      )}
    </div>
  );
}

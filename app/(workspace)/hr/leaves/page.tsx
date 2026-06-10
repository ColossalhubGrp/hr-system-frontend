import Link from "next/link";
import type { Route } from "next";
import { Plane, Plus } from "lucide-react";
import { LeavesFilters } from "@/components/leaves/leaves-filters";
import { LeavesTable } from "@/components/leaves/leaves-table";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import { fetchLeaves } from "@/lib/frappe/leaves";

export const metadata = { title: "Leaves · Colossal HR" };

type SP = {
  status?: string;
  type?: string;
  employee?: string;
  page?: string;
};

export default async function LeavesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await fetchLeaves({
    status: searchParams.status || undefined,
    leaveType: searchParams.type || undefined,
    employee: searchParams.employee || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <Plane className="h-3.5 w-3.5" />
            HR · Leaves
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Leave applications
          </h1>
          <p className="text-sm text-ash-600">
            {result.total.toLocaleString()} total in view.
          </p>
        </div>
        <Link
          href={"/hr/leaves/new" as Route}
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
        >
          <Plus className="h-4 w-4" />
          New application
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Open" value={result.counts.open} tone="amber" />
        <SummaryTile label="Approved" value={result.counts.approved} tone="rise" />
        <SummaryTile label="Rejected" value={result.counts.rejected} tone="fall" />
        <SummaryTile
          label="Days approved"
          value={result.counts.days.toFixed(result.counts.days % 1 === 0 ? 0 : 1)}
          tone="ink"
        />
      </div>

      <LeavesFilters
        leaveTypes={result.facets.leaveTypes}
        statuses={result.facets.statuses}
      />

      <LeavesTable rows={result.rows} />

      <DirectoryPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </div>
  );
}

const TILE_TONES: Record<string, string> = {
  amber: "bg-amber-100/60 text-amber-800",
  rise: "bg-rise/10 text-rise",
  fall: "bg-fall/10 text-fall",
  ink: "bg-ink-50/60 text-ink-800",
};

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: keyof typeof TILE_TONES | string;
}) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
      <span
        className={`mt-3 inline-flex rounded-chip px-2 py-0.5 text-[10px] font-medium ${
          TILE_TONES[tone] ?? TILE_TONES.ink
        }`}
      >
        Status
      </span>
    </div>
  );
}

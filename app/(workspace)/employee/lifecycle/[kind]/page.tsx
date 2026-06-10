import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, GitBranch, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  listLifecycle,
  type LifecycleKind,
  LIFECYCLE_META,
} from "@/lib/frappe/lifecycle";

const KINDS: LifecycleKind[] = [
  "onboarding",
  "separation",
  "transfer",
  "promotion",
  "grievance",
];

function isKind(v: unknown): v is LifecycleKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}

export async function generateMetadata({
  params,
}: {
  params: { kind: string };
}) {
  if (!isKind(params.kind)) return { title: "Lifecycle · Colossal HR" };
  return { title: `${LIFECYCLE_META[params.kind].label} · Colossal HR` };
}

type SP = { status?: string; page?: string };

export default async function LifecycleKindPage({
  params,
  searchParams,
}: {
  params: { kind: string };
  searchParams: SP;
}) {
  if (!isKind(params.kind)) notFound();
  const kind = params.kind;
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listLifecycle(kind, {
    status: searchParams.status || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/employee/lifecycle" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to lifecycle
      </Link>

      <PageHeader
        icon={GitBranch}
        crumb={`Employee · Lifecycle · ${result.label}`}
        title={result.label}
        subtitle={`${result.total.toLocaleString()} ${result.label.toLowerCase()} records.`}
        actions={
          <Link
            href={`/employee/lifecycle/${kind}/new` as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New {result.label.toLowerCase()}
          </Link>
        }
      />

      <FilterRow
        selects={
          result.statuses.length > 0
            ? [{ key: "status", label: "Status", options: result.statuses }]
            : undefined
        }
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) =>
          `/employee/lifecycle/${kind}/${encodeURIComponent(r.id)}`
        }
        empty={`No ${result.label.toLowerCase()} records yet.`}
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell id={r.employee} name={r.employeeName} />
            ),
          },
          {
            header: "Detail",
            className: "text-ash-800",
            cell: (r) => r.details ?? "—",
          },
          {
            header: "When",
            className: "text-ash-700",
            cell: (r) => (r.when ? fmtDate(r.when) : "—"),
          },
          {
            header: "Status",
            cell: (r) => <StatusPill status={r.status} />,
          },
        ]}
      />

      <DirectoryPagination
        page={page}
        pageSize={25}
        total={result.total}
      />
    </div>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

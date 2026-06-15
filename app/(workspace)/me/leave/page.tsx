import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import {
  listMyLeaveBalances,
  listMyLeaves,
} from "@/lib/frappe/my-self-service";

export const metadata = { title: "My leave · Colossal HR" };

const LEAVE_STATUS_TONES: Record<string, string> = {
  Open: "bg-amber-100 text-amber-800 ring-amber-200",
  Approved: "bg-rise/10 text-rise ring-rise/20",
  Rejected: "bg-fall/10 text-fall ring-fall/20",
  Cancelled: "bg-ash-100 text-ash-700 ring-ash-200",
};

export default async function MyLeavePage() {
  const [rows, balances] = await Promise.all([
    listMyLeaves(),
    listMyLeaveBalances(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/me" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to my workspace
      </Link>

      <PageHeader
        icon={CalendarDays}
        crumb="My workspace · Leave"
        title="My leave"
        subtitle="Your balance, applications, and a quick action to file a new request."
        actions={
          <Link
            href={"/me/leave/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            Apply for leave
          </Link>
        }
      />

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Balance by leave type
        </h2>
        {balances.length === 0 ? (
          <p className="text-sm text-ash-600">
            No leave allocations on file. HR hasn't assigned you a leave
            policy yet — let them know.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((b) => (
              <div
                key={b.leaveType}
                className="rounded-card border border-hairline bg-surface p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
                  {b.leaveType}
                </p>
                <p className="mt-1 text-2xl font-semibold text-ink-900">
                  {b.allocated.toFixed(1)} <span className="text-sm text-ash-500">days</span>
                </p>
                {!b.usable && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Allocation still in draft — HR needs to submit it.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <EmptyState>
            No leave applications on file. Use “Apply for leave” to file one.
          </EmptyState>
        ) : (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            empty="—"
            columns={[
              {
                header: "Type",
                cell: (r) => (
                  <span className="font-medium text-ash-900">{r.leaveType}</span>
                ),
              },
              {
                header: "From",
                className: "text-ash-700",
                cell: (r) => fmtDate(r.fromDate),
              },
              {
                header: "To",
                className: "text-ash-700",
                cell: (r) => fmtDate(r.toDate),
              },
              {
                header: "Status",
                cell: (r) => (
                  <StatusPill status={r.status} tones={LEAVE_STATUS_TONES} />
                ),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

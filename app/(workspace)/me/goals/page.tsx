import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { listMyGoals } from "@/lib/frappe/my-self-service";

export const metadata = { title: "My goals · Colossal HR" };

const TONES: Record<string, string> = {
  "In Progress": "bg-ink-50 text-ink-800 ring-ink-100",
  Completed: "bg-rise/10 text-rise ring-rise/20",
  Pending: "bg-amber-100 text-amber-800 ring-amber-200",
  Closed: "bg-ash-100 text-ash-700 ring-ash-200",
  Archived: "bg-ash-100 text-ash-700 ring-ash-200",
};

export default async function MyGoalsPage() {
  const rows = await listMyGoals();
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
        icon={ListChecks}
        crumb="My workspace · Goals"
        title="My goals"
        subtitle="Open and recent goals across appraisal cycles."
      />

      <section className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <EmptyState>
            No goals filed yet. Your manager can add the first goal from the HR
            Performance area, or you can do it yourself if your role allows.
          </EmptyState>
        ) : (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            rowHref={(r) => `/hr/performance/goals/${encodeURIComponent(r.id)}`}
            empty="—"
            columns={[
              {
                header: "Goal",
                cell: (r) => (
                  <span className="font-medium text-ash-900">{r.goalName}</span>
                ),
              },
              {
                header: "Cycle",
                className: "hidden md:table-cell text-ash-700",
                cell: (r) => r.appraisalCycle ?? "—",
              },
              {
                header: "Progress",
                cell: (r) => <ProgressBar value={r.progress} />,
              },
              {
                header: "Status",
                cell: (r) => <StatusPill status={r.status} tones={TONES} />,
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-canvas">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-ink-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-ash-700">{pct}%</span>
    </div>
  );
}

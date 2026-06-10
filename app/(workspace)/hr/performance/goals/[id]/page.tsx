import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Target } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getGoal } from "@/lib/frappe/performance";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const g = await getGoal(decodeURIComponent(params.id));
  return { title: g ? `${g.goalName} · Goal · Colossal HR` : "Goal" };
}

export default async function GoalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const g = await getGoal(id);
  if (!g) notFound();

  const editHref = `/hr/performance/goals/${encodeURIComponent(id)}/edit` as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance?tab=goals" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to goals
      </Link>

      <PageHeader
        icon={Target}
        crumb={`HR · Performance · Goal · ${g.id}`}
        title={g.goalName}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={g.status} />
            <span>· {g.progress}% progress</span>
          </span>
        }
        actions={
          <Link
            href={editHref}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        }
      />

      <Progress value={g.progress} />

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Goal
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Owner",
              value: g.employee ? (
                <Link
                  href={
                    `/employee/${encodeURIComponent(g.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {g.employeeName ?? g.employee}
                </Link>
              ) : (
                "Team / company"
              ),
            },
            { label: "Appraisal cycle", value: g.appraisalCycle },
            { label: "KRA", value: g.kra },
            { label: "Start", value: g.startDate },
            { label: "End", value: g.endDate },
            { label: "Status", value: g.status },
            { label: "Progress", value: `${g.progress}%` },
            { label: "Description", value: g.description, wide: true },
          ]}
        />
      </section>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium uppercase tracking-wide text-ash-500">
          Progress
        </span>
        <span className="font-semibold text-ink-900">{v}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full bg-ink-700 transition-all"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

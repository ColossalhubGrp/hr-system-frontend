import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, RefreshCcw, Target, Settings2 } from "lucide-react";
import {
  getAppraisalCycle,
  listSelectableGoals,
} from "@/lib/frappe/performance";
import { getMyAccess } from "@/lib/frappe/roles";
import { ManageCycleGoalsForm } from "@/components/performance/manage-cycle-goals-form";
import { setCycleSelectedGoalsAction } from "../../actions";

export const metadata = { title: "Appraisal cycle · Colossal HR" };

export default async function CycleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [cycle, access] = await Promise.all([
    getAppraisalCycle(id),
    getMyAccess(),
  ]);
  if (!cycle) notFound();

  // The picker shows everything HR could choose: goals currently in this
  // cycle PLUS any standalone goals that could be added. We dedupe on id.
  // `includeAttached: true` widens the pool because goals already attached
  // (to this or another cycle) are otherwise hidden.
  const allGoals = await listSelectableGoals({
    includeAttached: true,
    limit: 500,
  });
  // Merge in the cycle's currently-selected rows in case any of them aren't
  // returned by listSelectableGoals (e.g. archived since assignment).
  const seen = new Set(allGoals.map((g) => g.id));
  const merged = [
    ...allGoals,
    ...cycle.selectedGoals
      .filter((g) => !seen.has(g.goal))
      .map((g) => ({
        id: g.goal,
        goalName: g.goalName ?? g.goal,
        employee: g.employee,
        employeeName: g.employee,
        status: "In Progress",
        progress: 0,
      })),
  ];

  const currentlySelected = cycle.selectedGoals.map((g) => g.goal);
  const saveAction = setCycleSelectedGoalsAction.bind(null, cycle.id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to performance
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <RefreshCcw className="h-3.5 w-3.5" />
          HR · Performance · Cycle
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {cycle.cycleName}
          </h1>
          {cycle.status && (
            <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
              {cycle.status}
            </span>
          )}
        </div>
        <p className="text-sm text-ash-600">
          {fmtRange(cycle.startDate, cycle.endDate)} ·{" "}
          {cycle.company ?? "Company-wide"} ·{" "}
          {cycle.evaluationFramework ?? "KRA & Goals"}
        </p>
        {access.isHrAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/hr/performance/cycles/${encodeURIComponent(cycle.id)}/framework` as Route}
              className="inline-flex h-8 items-center gap-1 rounded-chip border border-hairline px-3 text-xs font-medium text-ash-700 hover:bg-canvas focus-ring"
            >
              <Settings2 className="h-3 w-3" />
              Evaluation framework
            </Link>
          </div>
        )}
      </header>

      <section className="card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ash-500">
            <Target className="h-3.5 w-3.5" />
            Selected goals ({cycle.selectedGoals.length})
          </h2>
          <Link
            href={"/hr/performance/goals/new" as Route}
            className="inline-flex h-8 items-center gap-1 rounded-chip border border-hairline px-3 text-xs font-medium text-ash-700 hover:bg-canvas focus-ring"
          >
            Create a new goal
          </Link>
        </div>
        {cycle.selectedGoals.length === 0 ? (
          <p className="rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-600">
            No goals selected for this cycle yet. Pick from the standalone pool
            below and save.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-card border border-hairline">
            {cycle.selectedGoals.map((g) => (
              <li
                key={g.goal}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <Link
                  href={`/hr/performance/goals/${encodeURIComponent(g.goal)}` as Route}
                  className="flex min-w-0 flex-1 flex-col focus-ring rounded-md"
                >
                  <span className="truncate font-medium text-ink-800">
                    {g.goalName ?? g.goal}
                  </span>
                  <span className="truncate text-xs text-ash-500">
                    {g.employee ?? "Unassigned"} · {g.goal}
                  </span>
                </Link>
                {g.weight > 0 && (
                  <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
                    {Math.round(g.weight)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          Manage goal roster
        </h2>
        <p className="text-sm text-ash-600">
          Tick or untick goals to change what this cycle tracks. Saving
          replaces the cycle's goal selection atomically.
        </p>
        <ManageCycleGoalsForm
          action={saveAction}
          goals={merged}
          currentlySelected={currentlySelected}
        />
      </section>
    </div>
  );
}

function fmtRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates not set";
  return `${fmtDate(start) ?? "—"} → ${fmtDate(end) ?? "—"}`;
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

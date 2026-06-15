import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, RefreshCcw } from "lucide-react";
import { CycleForm } from "@/components/performance/cycle-form";
import { listCompanies } from "@/lib/frappe/lookups";
import { listSelectableGoals } from "@/lib/frappe/performance";
import { getDefaultPerformanceFramework } from "@/lib/frappe/hr-settings";
import { createCycleAction } from "../../actions";

export const metadata = { title: "New appraisal cycle · Colossal HR" };

export default async function NewCyclePage() {
  // Three parallel reads: the company list for the form's company select,
  // the pool of standalone goals to surface in the new "Select goals" step,
  // and the org-wide default performance framework (set via /settings/performance)
  // which the cycle form pre-selects.
  const [companies, goals, defaultFramework] = await Promise.all([
    listCompanies(),
    listSelectableGoals({ includeAttached: false, limit: 300 }),
    getDefaultPerformanceFramework(),
  ]);

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
          HR · Performance · New appraisal cycle
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Define an appraisal cycle
        </h1>
        <p className="text-sm text-ash-600">
          Goals are created first, on their own. This form picks which of
          those goals the cycle will formally track.
        </p>
      </header>
      <CycleForm
        action={createCycleAction}
        companies={companies}
        defaultFramework={defaultFramework}
        goals={goals.map((g) => ({
          id: g.id,
          goalName: g.goalName,
          employee: g.employee,
          employeeName: g.employeeName,
          status: g.status,
          progress: g.progress,
        }))}
        cancelHref="/hr/performance"
      />
    </div>
  );
}

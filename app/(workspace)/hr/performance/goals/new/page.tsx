import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Target } from "lucide-react";
import { GoalForm } from "@/components/performance/goal-form";
import { listAppraisalCyclesNames } from "@/lib/frappe/lookups";
import { createGoalAction } from "../../actions";

export const metadata = { title: "New goal · Colossal HR" };

export default async function NewGoalPage() {
  const cycles = await listAppraisalCyclesNames();
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance?tab=goals" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to goals
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Target className="h-3.5 w-3.5" />
          HR · Performance · New goal
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Set a goal
        </h1>
      </header>
      <GoalForm
        mode="create"
        action={createGoalAction}
        cycles={cycles}
        cancelHref="/hr/performance?tab=goals"
      />
    </div>
  );
}

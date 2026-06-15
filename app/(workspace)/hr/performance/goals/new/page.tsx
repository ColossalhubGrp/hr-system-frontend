import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Target } from "lucide-react";
import { GoalForm } from "@/components/performance/goal-form";
import { getActiveAppraisalCycleFramework } from "@/lib/frappe/appraisal-framework";
import { createGoalAction } from "../../actions";

export const metadata = { title: "New goal · Colossal HR" };

export default async function NewGoalPage() {
  // Framework still drives terminology (Objective / Strategic objective /
  // Goal name) for the form labels. It comes from whichever cycle is
  // currently active — but goals no longer attach to a cycle at creation:
  // they stand alone and are picked into cycles later via the cycle form.
  const activeCycle = await getActiveAppraisalCycleFramework();
  const framework = activeCycle?.framework ?? "KRA & Goals";
  const heading =
    framework === "OKR"
      ? "Set an objective"
      : framework === "Balanced Scorecard"
        ? "Add a scorecard entry"
        : "Set a goal";

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
          HR · Performance · {heading}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {heading}
        </h1>
        <p className="text-sm text-ash-600">
          Save the goal first — appraisal cycles select from existing goals
          when they're created.
        </p>
      </header>
      <GoalForm
        mode="create"
        action={createGoalAction}
        framework={framework}
        cancelHref="/hr/performance?tab=goals"
      />
    </div>
  );
}

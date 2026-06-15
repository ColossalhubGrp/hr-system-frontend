import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Target } from "lucide-react";
import { GoalForm } from "@/components/performance/goal-form";
import { getGoal } from "@/lib/frappe/performance";
import {
  getCycleFramework,
  type EvaluationFramework,
} from "@/lib/frappe/appraisal-framework";
import { updateGoalAction } from "../../../actions";

export const metadata = { title: "Edit goal · Colossal HR" };

export default async function EditGoalPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const g = await getGoal(id);
  if (!g) notFound();
  // Framework still drives terminology (Objective / Goal / Scorecard entry).
  // For goals attached to a legacy cycle we infer from the cycle's framework;
  // standalone goals fall back to KRA & Goals labels.
  let framework: EvaluationFramework | null = null;
  if (g.appraisalCycle) framework = await getCycleFramework(g.appraisalCycle);
  if (g.perspective && framework === "KRA & Goals") framework = "Balanced Scorecard";

  const action = updateGoalAction.bind(null, id);
  const backHref = `/hr/performance/goals/${encodeURIComponent(id)}` as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {g.goalName}
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Target className="h-3.5 w-3.5" />
          HR · Performance · Edit goal
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit goal
        </h1>
      </header>

      <GoalForm
        mode="edit"
        action={action}
        framework={framework}
        cancelHref={backHref}
        initial={{
          goalName: g.goalName,
          description: g.description,
          employee: g.employee,
          status: g.status,
          progress: g.progress,
          startDate: g.startDate,
          endDate: g.endDate,
          appraisalCycle: g.appraisalCycle,
          perspective: g.perspective,
        }}
      />
    </div>
  );
}

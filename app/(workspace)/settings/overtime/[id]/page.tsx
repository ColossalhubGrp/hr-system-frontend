import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Layers, Trash2 } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import {
  getOvertimeRule,
  listAssignmentsForRule,
} from "@/lib/frappe/overtime";
import { OvertimeRuleForm } from "@/components/overtime/overtime-rule-form";
import { AssignmentList } from "@/components/overtime/assignment-list";
import {
  updateOvertimeRuleAction,
  createAssignmentAction,
  deleteAssignmentAction,
  deleteOvertimeRuleAction,
} from "../actions";

export const metadata = {
  title: "Overtime rule · Settings · Colossal HR",
};

export default async function OvertimeRuleEditPage({
  params,
}: {
  params: { id: string };
}) {
  await requireGroup("HR_ADMIN", `/settings/overtime/${params.id}`);
  const id = decodeURIComponent(params.id);
  const [rule, assignments] = await Promise.all([
    getOvertimeRule(id),
    listAssignmentsForRule(id),
  ]);
  if (!rule) notFound();

  const updateAction = updateOvertimeRuleAction.bind(null, id);
  // The form-action prop on <form> wants a void-returning action; the
  // underlying handler returns a FormState but we drop it here because we
  // either redirect on success (no return) or let toFormState surface a
  // toast via the page reload. For richer inline feedback we'd reach for a
  // client wrapper — not warranted for a delete button.
  const deleteRuleAction = async () => {
    "use server";
    await deleteOvertimeRuleAction(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={"/settings/overtime" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to overtime rules
      </Link>

      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <Clock className="h-3.5 w-3.5" />
            Settings · Overtime rules · {rule.id}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {rule.ruleName}
          </h1>
          <p className="text-sm text-ash-600">
            {rule.thresholdValue} {rule.thresholdType} · {rule.calculationMethod}{" "}
            · {rule.isActive ? "Active" : "Disabled"}
          </p>
        </div>
        <form action={deleteRuleAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-fall/40 px-3 text-xs font-semibold text-fall transition hover:bg-fall/5 focus-ring"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete rule
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ash-500">
          <Layers className="h-3.5 w-3.5" />
          Assignments ({assignments.length})
        </h2>
        <AssignmentList
          ruleId={rule.id}
          assignments={assignments}
          createAction={createAssignmentAction}
          deleteAction={deleteAssignmentAction}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          Rule definition
        </h2>
        <OvertimeRuleForm
          mode="edit"
          action={updateAction}
          cancelHref="/settings/overtime"
          initial={rule}
        />
      </section>
    </div>
  );
}

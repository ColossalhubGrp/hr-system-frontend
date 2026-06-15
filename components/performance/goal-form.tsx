"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/hr/performance/actions";

// Client mirror — kept in sync with lib/frappe/performance.ts. Inlined so
// this "use client" component doesn't pull the server-only module in.
const GOAL_STATUSES = [
  "In Progress",
  "Completed",
  "Pending",
  "Closed",
  "Archived",
];

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

/** Mirrors `BSC_PERSPECTIVES` from lib/frappe/performance.ts. */
const BSC_PERSPECTIVES = [
  "Financial",
  "Customer",
  "Internal Process",
  "Learning & Growth",
];

export function GoalForm({
  mode,
  action,
  cancelHref,
  initial,
  framework,
}: {
  mode: "create" | "edit";
  action: Action;
  cancelHref: string;
  /** Drives terminology + whether the BSC Perspective select is shown. */
  framework?: "OKR" | "Balanced Scorecard" | "KRA & Goals" | null;
  initial?: {
    goalName?: string;
    description?: string | null;
    employee?: string | null;
    status?: string;
    progress?: number;
    startDate?: string | null;
    endDate?: string | null;
    /** Legacy — shown read-only on edit if the goal was created when goals
     *  were still cycle-bound. New goals never set this. */
    appraisalCycle?: string | null;
    perspective?: string | null;
  };
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  // Terminology switches with the framework — same underlying field, different
  // user-facing labels.
  const nameLabel =
    framework === "OKR"
      ? "Objective"
      : framework === "Balanced Scorecard"
        ? "Strategic objective"
        : "Goal name";
  const sectionLabel =
    framework === "OKR"
      ? "Objective"
      : framework === "Balanced Scorecard"
        ? "Scorecard entry"
        : "Goal";
  const descriptionLabel =
    framework === "OKR" ? "Key results" : "Description";

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <FormSection title={sectionLabel}>
        <Field
          label={nameLabel}
          htmlFor="goal_name"
          required
          error={fe.goal_name}
          wide
          hint={
            framework === "OKR"
              ? "A short, qualitative objective. Key results go in the Key results section below."
              : framework === "Balanced Scorecard"
                ? "A strategic objective for the selected perspective."
                : undefined
          }
        >
          <TextInput
            id="goal_name"
            name="goal_name"
            defaultValue={initial?.goalName}
            invalid={Boolean(fe.goal_name)}
          />
        </Field>
        {framework === "Balanced Scorecard" && (
          <Field
            label="Perspective"
            htmlFor="perspective"
            hint="Which Balanced Scorecard perspective this goal sits in."
          >
            <SelectInput
              id="perspective"
              name="perspective"
              options={BSC_PERSPECTIVES}
              defaultValue={initial?.perspective ?? ""}
              placeholder="—"
            />
          </Field>
        )}
        <Field
          label="Owner (employee)"
          htmlFor="employee"
          hint="Employee ID — leave blank for a team / company goal."
        >
          <TextInput
            id="employee"
            name="employee"
            defaultValue={initial?.employee ?? undefined}
          />
        </Field>
        {/* Goals are now created standalone. The appraisal cycle picks them up
            later via the "Select goals" step on cycle creation. For goals
            created under the old flow we still surface the cycle name as a
            read-only line so the link isn't invisible to editors. */}
        {initial?.appraisalCycle && (
          <Field
            label="Linked appraisal cycle"
            htmlFor="appraisal_cycle_legacy"
            hint="This goal was created when goals were cycle-bound. To re-assign, edit the cycle's selected goals."
          >
            <TextInput
              id="appraisal_cycle_legacy"
              name="appraisal_cycle_legacy"
              defaultValue={initial.appraisalCycle ?? undefined}
              readOnly
            />
          </Field>
        )}
        <Field label="Start date" htmlFor="start_date">
          <TextInput
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={initial?.startDate ?? undefined}
          />
        </Field>
        <Field label="End date" htmlFor="end_date">
          <TextInput
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={initial?.endDate ?? undefined}
          />
        </Field>
        <Field label="Status" htmlFor="status" required>
          <SelectInput
            id="status"
            name="status"
            options={GOAL_STATUSES}
            defaultValue={initial?.status ?? "In Progress"}
          />
        </Field>
        <Field
          label="Progress %"
          htmlFor="progress"
          hint="0–100. Updated as the work moves."
        >
          <TextInput
            id="progress"
            name="progress"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={initial?.progress?.toString() ?? "0"}
          />
        </Field>
        <Field
          label={descriptionLabel}
          htmlFor="description"
          wide
          hint={
            framework === "OKR"
              ? "3–5 measurable key results, one per line. Score 0.0–1.0 each."
              : undefined
          }
        >
          <TextArea
            id="description"
            name="description"
            defaultValue={initial?.description ?? undefined}
            rows={4}
          />
        </Field>
      </FormSection>

      <SubmitRow cancelHref={cancelHref} mode={mode} />
    </form>
  );
}

function SubmitRow({
  cancelHref,
  mode,
}: {
  cancelHref: string;
  mode: "create" | "edit";
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
      <Link
        href={cancelHref as Route}
        className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        Cancel
      </Link>
      <Submit mode={mode} />
    </div>
  );
}

function Submit({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      <Save className="h-4 w-4" />
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create goal"
          : "Save changes"}
    </button>
  );
}

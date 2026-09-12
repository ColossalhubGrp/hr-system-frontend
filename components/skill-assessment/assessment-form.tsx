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
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import type { FormState } from "@/app/(workspace)/hr/skill-assessments/actions";

const EMPTY: FormState = {};
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function SkillAssessmentForm({
  action,
  employeeDirectory,
  skills,
  cancelHref = "/hr/skill-assessments",
}: {
  action: Action;
  employeeDirectory: EmployeeDirectoryEntry[];
  skills: string[];
  cancelHref?: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

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

      <FormSection title="Assessment">
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        <Field label="Skill" htmlFor="skill" required error={fe.skill}>
          {skills.length > 0 ? (
            <SelectInput id="skill" name="skill" options={skills} placeholder="Pick a skill" />
          ) : (
            <TextInput id="skill" name="skill" placeholder="Skill name" />
          )}
        </Field>
        <Field
          label="Proficiency (0–5)"
          htmlFor="proficiency"
          required
          error={fe.proficiency}
        >
          <TextInput
            id="proficiency"
            name="proficiency"
            type="number"
            step="0.5"
            min="0"
            max="5"
          />
        </Field>
        <Field
          label="Assessment date"
          htmlFor="assessment_date"
          required
          error={fe.assessment_date}
        >
          <TextInput
            id="assessment_date"
            name="assessment_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Notes / evidence" htmlFor="notes" wide>
          <TextArea
            id="notes"
            name="notes"
            rows={3}
            placeholder="What was the basis for this rating — project, certification, peer review?"
          />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail">
        <Link
          href={cancelHref as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit />
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Log assessment"}
    </button>
  );
}

"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextInput,
} from "@/components/employee/form-bits";
import type {
  BoardingKind,
  FormState,
} from "@/app/(workspace)/settings/boarding-templates/actions";

type Activity = {
  activity_name: string;
  role?: string;
  user?: string;
  begin_on?: number;
  duration?: number;
  task_weight?: number;
  required_for_employee_creation?: boolean;
};

const EMPTY: FormState = {};

export function BoardingTemplateForm({
  kind,
  action,
  cancelHref,
  companies,
  initial,
}: {
  kind: BoardingKind;
  action: (
    kind: BoardingKind,
    prev: FormState,
    form: FormData,
  ) => Promise<FormState>;
  cancelHref: string;
  companies: string[];
  initial?: {
    name?: string;
    department?: string | null;
    designation?: string | null;
    employeeGrade?: string | null;
    company?: string | null;
    activities?: Activity[];
  };
}) {
  const bound = action.bind(null, kind);
  const [state, dispatch] = useFormState(bound, EMPTY);
  const [activities, setActivities] = useState<Activity[]>(
    initial?.activities ?? [],
  );
  const set = (i: number, patch: Partial<Activity>) =>
    setActivities((prev) => prev.map((a, x) => (x === i ? { ...a, ...patch } : a)));

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

      <FormSection title="Template">
        {initial?.name ? (
          <input type="hidden" name="name" value={initial.name} />
        ) : (
          <Field label="Template name" htmlFor="name" required>
            <TextInput id="name" name="name" placeholder="e.g. Standard software engineer onboarding" />
          </Field>
        )}
        <Field label="Company" htmlFor="company">
          <SelectInput
            id="company"
            name="company"
            options={companies}
            defaultValue={initial?.company ?? undefined}
            placeholder="— any —"
          />
        </Field>
        <Field label="Department" htmlFor="department">
          <TextInput id="department" name="department" defaultValue={initial?.department ?? undefined} />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <TextInput id="designation" name="designation" defaultValue={initial?.designation ?? undefined} />
        </Field>
        <Field label="Grade" htmlFor="employee_grade">
          <TextInput
            id="employee_grade"
            name="employee_grade"
            defaultValue={initial?.employeeGrade ?? undefined}
          />
        </Field>
      </FormSection>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Activities
          </h2>
          <button
            type="button"
            onClick={() =>
              setActivities([
                ...activities,
                {
                  activity_name: "",
                  begin_on: 0,
                  duration: 1,
                  task_weight: 0,
                  required_for_employee_creation: false,
                },
              ])
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline bg-canvas px-3 text-sm font-medium text-ash-800 hover:bg-canvas/70 focus-ring"
          >
            <Plus className="h-4 w-4" />
            Add activity
          </button>
        </div>
        {activities.length === 0 ? (
          <p className="rounded-md border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
            No activities yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map((a, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 rounded-card border border-hairline bg-canvas/40 p-3 md:grid-cols-7"
              >
                <input
                  placeholder="Activity"
                  value={a.activity_name}
                  onChange={(e) => set(i, { activity_name: e.target.value })}
                  className="input md:col-span-2"
                />
                <input
                  placeholder="Role"
                  value={a.role ?? ""}
                  onChange={(e) => set(i, { role: e.target.value || undefined })}
                  className="input"
                />
                <input
                  placeholder="User (email)"
                  value={a.user ?? ""}
                  onChange={(e) => set(i, { user: e.target.value || undefined })}
                  className="input"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Begin on (days)"
                  value={a.begin_on ?? ""}
                  onChange={(e) =>
                    set(i, { begin_on: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="input"
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Duration"
                  value={a.duration ?? ""}
                  onChange={(e) =>
                    set(i, { duration: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="input"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.05"
                    placeholder="Weight"
                    value={a.task_weight ?? ""}
                    onChange={(e) =>
                      set(i, { task_weight: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setActivities(activities.filter((_, x) => x !== i))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-chip border border-hairline text-fall hover:bg-fall/[0.06] focus-ring"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {kind === "onboarding" && (
                  <label className="col-span-full flex items-center gap-2 text-xs text-ash-700">
                    <input
                      type="checkbox"
                      checked={Boolean(a.required_for_employee_creation)}
                      onChange={(e) =>
                        set(i, { required_for_employee_creation: e.target.checked })
                      }
                      className="h-4 w-4 accent-ink-800"
                    />
                    Must be completed before Employee record can be created
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <input type="hidden" name="activities_json" value={JSON.stringify(activities)} />

      <div className="flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail">
        <Link
          href={cancelHref as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit />
      </div>

      <style jsx>{`
        .input {
          height: 2.25rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(226 232 240 / 1);
          background: white;
          padding: 0 0.6rem;
          font-size: 0.875rem;
          color: rgb(15 23 42 / 1);
        }
      `}</style>
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
      {pending ? "Saving…" : "Save template"}
    </button>
  );
}

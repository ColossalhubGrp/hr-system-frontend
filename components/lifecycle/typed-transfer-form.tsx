"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import { createTypedTransferAction } from "@/app/(workspace)/employee/lifecycle/actions";
import type { FormState } from "@/app/(workspace)/employee/lifecycle/actions";
import type { TransferType } from "@/lib/frappe/transfer-types";

type DirectoryEntry = {
  id: string;
  employee_name: string;
  user_id: string | null;
  department: string | null;
  designation: string | null;
  pay_grade: string | null;
  company: string | null;
  branch: string | null;
  reports_to: string | null;
  employment_type: string | null;
  default_shift: string | null;
};

const EMPTY: FormState = {};

/**
 * Per-type transfer form. HR picks the employee → we snapshot the field
 * the type is about (department, pay_grade, etc.) from the directory and
 * show it as "Current" so they know what they're changing from. On
 * submit, the server action pairs that snapshot with the new value into
 * one `employee_transfer_details` row on the Transfer doc.
 */
export function TypedTransferForm({
  type,
  employeeDirectory,
  defaultEmployee,
  newValueOptions,
  cancelHref,
}: {
  type: TransferType;
  employeeDirectory: DirectoryEntry[];
  defaultEmployee?: string;
  newValueOptions: Array<{ value: string; label: string }>;
  cancelHref: string;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    defaultEmployee ?? "",
  );

  const selectedEmployee = useMemo(
    () => employeeDirectory.find((e) => e.id === selectedEmployeeId) ?? null,
    [employeeDirectory, selectedEmployeeId],
  );
  const currentValue = selectedEmployee
    ? ((selectedEmployee as unknown as Record<string, string | null>)[
        type.employeeField
      ] ?? null)
    : null;
  const currentCompany = selectedEmployee?.company ?? null;

  // Bind the action with the type slug + snapshot so the server never has
  // to re-fetch to figure out the current value.
  const action = createTypedTransferAction.bind(null, type.slug, {
    company: currentCompany,
    fieldValue: currentValue,
  });
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  const lastSeen = useRef(state);
  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors
          ? "Check the highlighted fields."
          : undefined,
      });
    }
  }, [state]);

  const employeeOptions = employeeDirectory.map((e) => ({
    value: e.id,
    label: `${e.employee_name} (${e.id})`,
  }));

  const newValueLabelForCurrent = (() => {
    if (!currentValue) return null;
    const match = newValueOptions.find((o) => o.value === currentValue);
    return match ? match.label : currentValue;
  })();

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

      <FormSection title={type.label}>
        <Field label="Employee" htmlFor="employee" required error={fe.employee}>
          <SelectInput
            id="employee"
            name="employee"
            options={employeeOptions}
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            placeholder="Select employee"
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field
          label="Transfer date"
          htmlFor="transfer_date"
          required
          error={fe.transfer_date}
        >
          <TextInput
            id="transfer_date"
            name="transfer_date"
            type="date"
            invalid={Boolean(fe.transfer_date)}
          />
        </Field>

        <Field label={`Current ${type.formLabel.toLowerCase().replace(/^new /, "")}`} htmlFor="current_display">
          <TextInput
            id="current_display"
            name="current_display"
            value={
              !selectedEmployeeId
                ? ""
                : newValueLabelForCurrent ?? "(not set)"
            }
            readOnly
            aria-readonly
            placeholder={selectedEmployeeId ? "(not set)" : "Pick an employee first"}
            className="cursor-not-allowed bg-muted/40 text-muted-foreground"
          />
        </Field>
        <Field
          label={type.formLabel}
          htmlFor="new_value"
          required
          error={fe.new_value}
          hint={
            newValueOptions.length === 0
              ? "No options available. Seed some via the relevant admin page first."
              : undefined
          }
        >
          <SelectInput
            id="new_value"
            name="new_value"
            options={newValueOptions}
            placeholder="— pick a target —"
            invalid={Boolean(fe.new_value)}
          />
        </Field>

        {type.isCompanyMove && (
          <Field
            label="Create a fresh Employee ID"
            htmlFor="create_new_employee_id"
            hint="Tick when moving to a subsidiary that keeps its own HRIS numbering. On submit, Frappe copies the Employee record to a new ID and marks this one as Left."
            wide
          >
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                id="create_new_employee_id"
                type="checkbox"
                name="create_new_employee_id"
                className="h-4 w-4 rounded border-input"
              />
              Yes, issue a new Employee ID for the target company
            </label>
          </Field>
        )}

        <Field label="Reason / notes" htmlFor="reason" wide>
          <TextArea
            id="reason"
            name="reason"
            rows={3}
            placeholder="Why this transfer? Optional but useful for the audit trail."
          />
        </Field>
      </FormSection>

      <SubmitBar cancelHref={cancelHref} />
    </form>
  );
}

function SubmitBar({ cancelHref }: { cancelHref: string }) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
      <Link
        href={cancelHref as Route}
        className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        Cancel
      </Link>
      <SubmitBtn />
    </div>
  );
}

function SubmitBtn() {
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
      <Send className="h-4 w-4" />
      {pending ? "Filing…" : "Create transfer"}
    </button>
  );
}

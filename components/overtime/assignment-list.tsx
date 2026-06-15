"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type {
  AppliesTo,
  OvertimeAssignmentRow,
} from "@/lib/frappe/overtime";
import type { FormState } from "@/app/(workspace)/settings/overtime/actions";

type CreateAction = (
  prev: FormState,
  form: FormData,
) => Promise<FormState>;
type DeleteAction = (assignmentId: string, ruleId: string) => Promise<FormState>;

const APPLIES: AppliesTo[] = [
  "Global",
  "Country",
  "Department",
  "Employment Type",
  "Employee",
];

const EMPTY: FormState = {};

export function AssignmentList({
  ruleId,
  assignments,
  createAction,
  deleteAction,
}: {
  ruleId: string;
  assignments: OvertimeAssignmentRow[];
  createAction: CreateAction;
  deleteAction: DeleteAction;
}) {
  return (
    <div className="flex flex-col gap-4">
      {assignments.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-600">
          No assignments yet. Add at least a <strong>Global</strong> binding to
          make the rule apply to everyone, or scope it tighter below.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-card border border-hairline">
          {assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              a={a}
              onDelete={() => deleteAction(a.id, ruleId)}
            />
          ))}
        </ul>
      )}

      <CreateAssignmentForm ruleId={ruleId} action={createAction} />
    </div>
  );
}

function AssignmentRow({
  a,
  onDelete,
}: {
  a: OvertimeAssignmentRow;
  onDelete: () => Promise<FormState>;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Delete this ${a.appliesTo} assignment?`)) return;
    setErr(null);
    start(async () => {
      const res = await onDelete();
      if (res.error) setErr(res.error);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
          {a.appliesTo}
        </span>
        <span className="font-medium text-ink-800">
          {a.target ?? "Everyone"}
        </span>
        <span className="text-xs text-ash-500">
          · priority {a.priority}
        </span>
        {(a.validFrom || a.validTo) && (
          <span className="text-xs text-ash-500">
            · {a.validFrom ?? "open"} → {a.validTo ?? "open"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {err && (
          <span className="text-xs text-fall">
            <AlertCircle className="inline h-3 w-3" /> {err}
          </span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-chip border border-fall/40 px-2 py-1 text-xs font-medium text-fall transition hover:bg-fall/5 focus-ring disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          Remove
        </button>
      </div>
    </li>
  );
}

function CreateAssignmentForm({
  ruleId,
  action,
}: {
  ruleId: string;
  action: CreateAction;
}) {
  const [scope, setScope] = useState<AppliesTo>("Global");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const justSaved =
    state && Object.keys(state).length === 0 && state !== EMPTY;

  return (
    <form
      action={(form) => {
        // Reset the relevant target field for scopes we're NOT picking, so
        // we don't accidentally POST a stale value.
        if (scope !== "Country") form.delete("country");
        if (scope !== "Department") form.delete("department");
        if (scope !== "Employment Type") form.delete("employment_type");
        if (scope !== "Employee") form.delete("employee");
        dispatch(form);
      }}
      className="rounded-card border border-hairline bg-surface p-4"
    >
      <input type="hidden" name="rule" value={ruleId} />
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ash-500">
        <Plus className="h-3.5 w-3.5" />
        Add assignment
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Cell label="Applies to" htmlFor="applies_to" wide>
          <select
            id="applies_to"
            name="applies_to"
            value={scope}
            onChange={(e) => setScope(e.target.value as AppliesTo)}
            className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
          >
            {APPLIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Cell>

        {scope === "Country" && (
          <Cell label="Country" htmlFor="country" wide error={fe.country}>
            <input
              id="country"
              name="country"
              placeholder="e.g. Zimbabwe"
              className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
            />
          </Cell>
        )}
        {scope === "Department" && (
          <Cell label="Department" htmlFor="department" wide error={fe.department}>
            <input
              id="department"
              name="department"
              placeholder="e.g. Engineering - RI"
              className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
            />
          </Cell>
        )}
        {scope === "Employment Type" && (
          <Cell label="Employment Type" htmlFor="employment_type" wide error={fe.employment_type}>
            <input
              id="employment_type"
              name="employment_type"
              placeholder="e.g. Full-time"
              className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
            />
          </Cell>
        )}
        {scope === "Employee" && (
          <Cell label="Employee ID" htmlFor="employee" wide error={fe.employee}>
            <input
              id="employee"
              name="employee"
              placeholder="HR-EMP-…"
              className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
            />
          </Cell>
        )}

        <Cell label="Priority" htmlFor="priority">
          <input
            id="priority"
            name="priority"
            type="number"
            defaultValue="0"
            className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
          />
        </Cell>
        <Cell label="Valid from (override)" htmlFor="valid_from">
          <input
            id="valid_from"
            name="valid_from"
            type="date"
            className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
          />
        </Cell>
        <Cell label="Valid to (override)" htmlFor="valid_to">
          <input
            id="valid_to"
            name="valid_to"
            type="date"
            className="h-9 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
          />
        </Cell>
        <div className="sm:col-span-4">
          {state.error && (
            <p className="mb-2 flex items-center gap-1 rounded-md border border-fall/30 bg-fall/[0.06] px-2 py-1 text-xs text-fall">
              <AlertCircle className="h-3 w-3" />
              {state.error}
            </p>
          )}
          {justSaved && (
            <p className="mb-2 flex items-center gap-1 rounded-md border border-rise/30 bg-rise/[0.06] px-2 py-1 text-xs text-rise">
              <CheckCircle2 className="h-3 w-3" />
              Assignment added.
            </p>
          )}
          <SubmitAssignment />
        </div>
      </div>
    </form>
  );
}

function Cell({
  label,
  htmlFor,
  wide,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  wide?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`flex flex-col gap-1 ${wide ? "sm:col-span-2" : ""}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-ash-500">
        {label}
      </span>
      {children}
      {error && <span className="text-xs text-fall">{error}</span>}
    </label>
  );
}

function SubmitAssignment() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Adding…
        </>
      ) : (
        <>
          <Plus className="h-3.5 w-3.5" />
          Add assignment
        </>
      )}
    </button>
  );
}

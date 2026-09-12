"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";

type Action = (
  p: StdFormState & { updated?: number },
  f: FormData,
) => Promise<StdFormState & { updated?: number }>;
const EMPTY: StdFormState & { updated?: number } = {};

export function BulkHolidayAssignForm({
  holidayLists,
  companies,
  departments,
  branches,
  action,
}: {
  holidayLists: string[];
  companies: string[];
  departments: string[];
  branches: string[];
  action: Action;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state.error && (
        <p className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}
      {typeof state.updated === "number" && (
        <p className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-rise" />
          Assigned to <strong>{state.updated}</strong> employee
          {state.updated === 1 ? "" : "s"}.
        </p>
      )}

      <section className="card p-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm sm:col-span-3">
          <span className="text-xs text-ash-600">
            Holiday list <span className="text-fall">*</span>
          </span>
          <select
            name="holiday_list"
            required
            defaultValue=""
            className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
          >
            <option value="" disabled>
              Pick a holiday list
            </option>
            {holidayLists.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </label>
        <F label="Company" name="company" opts={companies} />
        <F label="Department" name="department" opts={departments} />
        <F label="Branch" name="branch" opts={branches} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ash-600">Employment type</span>
          <input
            name="employment_type"
            placeholder="e.g. Full Time"
            className="h-10 rounded-md border border-hairline bg-white px-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ash-600">Grade</span>
          <input
            name="grade"
            placeholder="e.g. Band 3"
            className="h-10 rounded-md border border-hairline bg-white px-2 text-sm"
          />
        </label>
        <p className="sm:col-span-3 text-xs text-ash-500">
          Any filter left blank is ignored. Every remaining Active employee
          gets the holiday list.
        </p>
      </section>

      <div className="flex justify-end">
        <SaveBtn />
      </div>
    </form>
  );
}

function F({
  label,
  name,
  opts,
}: {
  label: string;
  name: string;
  opts: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-ash-600">{label}</span>
      <select
        name={name}
        defaultValue=""
        className="h-10 rounded-md border border-hairline bg-white px-2 text-sm"
      >
        <option value="">— any —</option>
        {opts.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function SaveBtn() {
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
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Assigning…
        </>
      ) : (
        <>
          <Send className="h-4 w-4" /> Bulk assign
        </>
      )}
    </button>
  );
}

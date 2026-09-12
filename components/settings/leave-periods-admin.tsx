"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";
import type { LeavePeriodRow } from "@/lib/frappe/leave-admin";

type Action = (p: StdFormState, f: FormData) => Promise<StdFormState>;
const EMPTY: StdFormState = {};

export function LeavePeriodsAdmin({
  rows,
  companies,
  createAction,
  deleteAction,
}: {
  rows: LeavePeriodRow[];
  companies: string[];
  createAction: Action;
  deleteAction: Action;
}) {
  const [createState, createDispatch] = useFormState(createAction, EMPTY);
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
          New leave period
        </h2>
        {createState.error && (
          <p
            role="alert"
            className="mb-3 flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-3 py-2 text-sm text-fall"
          >
            <AlertCircle className="h-4 w-4" />
            {createState.error}
          </p>
        )}
        <form
          action={createDispatch}
          className="grid grid-cols-1 gap-3 sm:grid-cols-5"
        >
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-xs text-ash-600">
              Name <span className="text-fall">*</span>
            </span>
            <input
              name="name"
              required
              placeholder="e.g. FY2026"
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ash-600">
              From <span className="text-fall">*</span>
            </span>
            <input
              type="date"
              name="from_date"
              required
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ash-600">
              To <span className="text-fall">*</span>
            </span>
            <input
              type="date"
              name="to_date"
              required
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ash-600">Company</span>
            <select
              name="company"
              defaultValue=""
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm sm:col-span-4">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Active
          </label>
          <div className="sm:col-span-5 flex justify-end">
            <SaveBtn label="Create period" />
          </div>
        </form>
      </section>

      <section className="card overflow-hidden p-0">
        <p className="border-b border-hairline bg-canvas/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ash-500">
          Existing periods ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-ash-500">
            None yet — create your first period above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline text-left text-[11px] font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">From</th>
                <th className="px-4 py-2">To</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-2 font-medium text-ink-800">{r.name}</td>
                  <td className="px-4 py-2 text-ash-700">{r.fromDate}</td>
                  <td className="px-4 py-2 text-ash-700">{r.toDate}</td>
                  <td className="px-4 py-2 text-ash-700">{r.company ?? "—"}</td>
                  <td className="px-4 py-2 text-ash-700">
                    {r.isActive ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteBtn name={r.name} action={deleteAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function DeleteBtn({ name, action }: { name: string; action: Action }) {
  const [, dispatch] = useFormState(action, EMPTY);
  return (
    <form action={dispatch} className="inline">
      <input type="hidden" name="name" value={name} />
      <DeleteTiny />
    </form>
  );
}

function DeleteTiny() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md p-1.5 text-ash-500 transition hover:bg-fall/10 hover:text-fall focus-ring"
      title="Delete period"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}

function SaveBtn({ label }: { label: string }) {
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
          <Loader2 className="h-4 w-4 animate-spin" /> Saving…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

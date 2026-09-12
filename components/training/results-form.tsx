"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FormState } from "@/app/(workspace)/hr/training/[id]/results/actions";

type Row = { employee: string; employeeName: string | null; hours?: number; grade?: string; comments?: string };

const EMPTY: FormState = {};

export function ResultsForm({
  eventId,
  attendees,
  action,
}: {
  eventId: string;
  attendees: Array<{ employee: string; employeeName: string | null }>;
  action: (eventId: string, prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const bound = action.bind(null, eventId);
  const [state, dispatch] = useFormState(bound, EMPTY);
  const [rows, setRows] = useState<Row[]>(
    attendees.map((a) => ({
      employee: a.employee,
      employeeName: a.employeeName,
    })),
  );

  const set = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, x) => (x === i ? { ...r, ...patch } : r)));

  const payload = rows
    .filter((r) => r.grade || r.hours != null || r.comments)
    .map((r) => ({
      employee: r.employee,
      hours: r.hours,
      grade: r.grade,
      comments: r.comments,
    }));

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

      <section className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
            <tr>
              <th className="px-4 py-2.5">Attendee</th>
              <th className="px-4 py-2.5 w-24">Hours</th>
              <th className="px-4 py-2.5 w-32">Grade</th>
              <th className="px-4 py-2.5">Comments</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ash-500">
                  No attendees on this event yet.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.employee} className="border-t border-hairline">
                  <td className="px-4 py-2.5 text-ash-900">
                    <div className="font-medium">{r.employeeName ?? r.employee}</div>
                    <div className="text-xs text-ash-500">{r.employee}</div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={r.hours ?? ""}
                      onChange={(e) =>
                        set(i, { hours: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="h-9 w-full rounded-chip border border-hairline bg-surface px-2 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={r.grade ?? ""}
                      placeholder="A / Pass / …"
                      onChange={(e) => set(i, { grade: e.target.value || undefined })}
                      className="h-9 w-full rounded-chip border border-hairline bg-surface px-2 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={r.comments ?? ""}
                      onChange={(e) => set(i, { comments: e.target.value || undefined })}
                      className="h-9 w-full rounded-chip border border-hairline bg-surface px-2 text-sm"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <input type="hidden" name="employees_json" value={JSON.stringify(payload)} />

      <div className="flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail">
        <Link
          href={`/hr/training/${encodeURIComponent(eventId)}` as Route}
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
      {pending ? "Saving…" : "Save grades"}
    </button>
  );
}

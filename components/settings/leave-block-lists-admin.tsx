"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";
import type { LeaveBlockListRow } from "@/lib/frappe/leave-admin";

type Action = (p: StdFormState, f: FormData) => Promise<StdFormState>;
const EMPTY: StdFormState = {};

export function LeaveBlockListsAdmin({
  rows,
  companies,
  createAction,
}: {
  rows: LeaveBlockListRow[];
  companies: string[];
  createAction: Action;
}) {
  const [state, dispatch] = useFormState(createAction, EMPTY);
  const [blocks, setBlocks] = useState<Array<{ block_date: string; reason: string }>>([]);
  const [d, setD] = useState("");
  const [r, setR] = useState("");
  const addBlock = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !r.trim()) return;
    if (blocks.some((b) => b.block_date === d)) return;
    setBlocks((prev) => [...prev, { block_date: d, reason: r.trim() }]);
    setD("");
    setR("");
  };
  const rmBlock = (date: string) =>
    setBlocks((prev) => prev.filter((b) => b.block_date !== date));
  const json = useMemo(() => JSON.stringify(blocks), [blocks]);
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
          New block list
        </h2>
        {state.error && (
          <p className="mb-3 flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-3 py-2 text-sm text-fall">
            <AlertCircle className="h-4 w-4" /> {state.error}
          </p>
        )}
        <form action={dispatch} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-xs text-ash-600">
              List name <span className="text-fall">*</span>
            </span>
            <input
              name="name"
              required
              placeholder="e.g. Year-end close 2026"
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ash-600">Company</span>
            <select
              name="company"
              defaultValue=""
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm"
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 self-end pb-1 text-sm">
            <input
              type="checkbox"
              name="applies_to_all_departments"
              defaultChecked
              className="h-4 w-4 rounded border-hairline text-ink-700"
            />
            All departments
          </label>

          <div className="sm:col-span-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ash-500">
              Blocked dates
            </p>
            {blocks.length > 0 && (
              <ul className="mb-3 flex flex-wrap gap-2">
                {blocks.map((b) => (
                  <li
                    key={b.block_date}
                    className="inline-flex items-center gap-2 rounded-chip border border-hairline bg-canvas/50 py-1 pl-3 pr-1 text-sm"
                  >
                    <span className="font-mono">{b.block_date}</span>
                    <span className="text-ash-600">— {b.reason}</span>
                    <button
                      type="button"
                      onClick={() => rmBlock(b.block_date)}
                      className="rounded-md p-1 text-ash-500 hover:bg-fall/10 hover:text-fall"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2 rounded-card border border-dashed border-hairline bg-canvas/30 p-3">
              <label className="flex flex-col gap-1 text-xs">
                Date
                <input
                  type="date"
                  value={d}
                  onChange={(e) => setD(e.target.value)}
                  className="h-9 rounded-md border border-hairline bg-white px-2 text-sm"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs">
                Reason
                <input
                  value={r}
                  onChange={(e) => setR(e.target.value)}
                  placeholder="Year-end close, product launch, exam period…"
                  className="h-9 rounded-md border border-hairline bg-white px-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={addBlock}
                disabled={!d || !r.trim()}
                className="inline-flex h-9 items-center gap-1 rounded-chip border border-hairline bg-surface px-3 text-xs font-semibold text-ash-700 hover:border-ink-400 hover:text-ink-800 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>
          <input type="hidden" name="blocks_json" value={json} />
          <div className="sm:col-span-4 flex justify-end">
            <SaveBtn />
          </div>
        </form>
      </section>

      <section className="card overflow-hidden p-0">
        <p className="border-b border-hairline bg-canvas/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ash-500">
          Existing block lists ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-ash-500">
            None yet — create your first list above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline text-left text-[11px] font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">All departments</th>
                <th className="px-4 py-2 text-right">Blocked dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-2 font-medium text-ink-800">{r.name}</td>
                  <td className="px-4 py-2 text-ash-700">{r.company ?? "—"}</td>
                  <td className="px-4 py-2 text-ash-700">
                    {r.appliesToAllDepartments ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-2 text-right text-ash-700">
                    {r.blocksCount}
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
          <Loader2 className="h-4 w-4 animate-spin" /> Saving…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" /> Create block list
        </>
      )}
    </button>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { Route } from "next";
import { AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";
import type { TemplateRatingRow } from "@/lib/frappe/setup-appraisal-templates";

type Action = (prev: StdFormState, form: FormData) => Promise<StdFormState>;
const EMPTY: StdFormState = {};

export function TemplateEditor({
  mode,
  action,
  initial,
  criteriaPool,
  cancelHref = "/settings/appraisal-templates",
}: {
  mode: "new" | "edit";
  action: Action;
  initial?: {
    name: string;
    description: string | null;
    ratingCriteria: TemplateRatingRow[];
  };
  /** Existing Employee Feedback Criteria — populates the "New criterion"
   *  datalist so HR picks from what's already defined. */
  criteriaPool: string[];
  cancelHref?: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [rows, setRows] = useState(
    (initial?.ratingCriteria ?? []).map((r) => ({
      criteria: r.criteria,
      perWeightage: r.perWeightage,
    })),
  );
  const [newCriterion, setNewCriterion] = useState("");
  const [newWeightage, setNewWeightage] = useState<number>(0);

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + (r.perWeightage || 0), 0),
    [rows],
  );
  const totalOk = Math.abs(total - 100) < 0.5;

  const addRow = () => {
    const name = newCriterion.trim();
    if (!name) return;
    if (rows.some((r) => r.criteria.toLowerCase() === name.toLowerCase())) {
      setNewCriterion("");
      setNewWeightage(0);
      return;
    }
    setRows((prev) => [...prev, { criteria: name, perWeightage: newWeightage || 0 }]);
    setNewCriterion("");
    setNewWeightage(0);
  };

  const removeRow = (name: string) => {
    setRows((prev) => prev.filter((r) => r.criteria !== name));
  };

  const updateWeight = (name: string, w: number) => {
    setRows((prev) =>
      prev.map((r) => (r.criteria === name ? { ...r, perWeightage: w } : r)),
    );
  };

  const criteriaJson = JSON.stringify(
    rows.map((r) => ({ criteria: r.criteria, per_weightage: r.perWeightage })),
  );

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

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Template
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ash-600">
              Name<span className="ml-0.5 text-fall">*</span>
            </span>
            <input
              type="text"
              name="name"
              defaultValue={initial?.name}
              readOnly={mode === "edit"}
              placeholder="e.g. Half Year — Standard"
              className={cn(
                "h-10 rounded-md border bg-white px-2 text-sm focus-ring",
                fe.name ? "border-fall" : "border-hairline",
                mode === "edit" && "cursor-not-allowed bg-canvas/50 text-ash-600",
              )}
            />
            {fe.name && (
              <span className="text-xs text-fall">{fe.name}</span>
            )}
            {mode === "edit" && (
              <span className="text-xs text-ash-500">
                Rename a template by cloning it into a new one — cycles link
                by name.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-medium text-ash-600">
              Description
            </span>
            <textarea
              name="description"
              defaultValue={initial?.description ?? ""}
              rows={2}
              placeholder="What this template is for. HR sees this on the cycle setup screen."
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Rating criteria
          </h2>
          <p className="mt-1 text-xs text-ash-500">
            The criteria HR sees when scoring feedback under any cycle that
            uses this template. Weightages must total 100.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="mb-4 rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
            No criteria yet. Pick from the pool below or type new ones.
          </p>
        ) : (
          <div className="mb-4 overflow-hidden rounded-card border border-hairline">
            <table className="w-full text-sm">
              <thead className="bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                <tr>
                  <th className="px-3 py-2">Criterion</th>
                  <th className="px-3 py-2 w-40 text-right">Weightage %</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((r) => (
                  <tr key={r.criteria}>
                    <td className="px-3 py-3 text-ash-800">{r.criteria}</td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={r.perWeightage}
                        onChange={(e) =>
                          updateWeight(r.criteria, Number(e.target.value) || 0)
                        }
                        min={0}
                        max={100}
                        step={1}
                        className="w-24 rounded-md border border-hairline bg-white px-2 py-1.5 text-right text-sm focus-ring"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(r.criteria)}
                        title={`Remove ${r.criteria}`}
                        className="rounded-md p-1 text-ash-500 transition hover:bg-fall/10 hover:text-fall focus-ring"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-hairline bg-canvas/30 text-xs">
                <tr>
                  <td className="px-3 py-2 text-right font-medium text-ash-600">
                    Total weightage
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-semibold",
                      totalOk ? "text-ash-800" : "text-fall",
                    )}
                  >
                    {total.toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-ash-500">
                    {totalOk ? "" : "must total 100"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Add-row surface */}
        <div className="flex flex-wrap items-end gap-2 rounded-card border border-dashed border-hairline bg-canvas/30 p-3">
          <div className="flex flex-1 min-w-[220px] flex-col gap-1">
            <label className="text-xs font-medium text-ash-600" htmlFor="tpl-new-criterion">
              New criterion
            </label>
            <input
              id="tpl-new-criterion"
              type="text"
              list="tpl-criteria-pool"
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              placeholder={
                criteriaPool.length > 0
                  ? "Pick from the pool or type a new one"
                  : "e.g. Communication, Ownership, Technical delivery"
              }
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            />
            <datalist id="tpl-criteria-pool">
              {criteriaPool
                .filter((n) => !rows.some((r) => r.criteria === n))
                .map((n) => (
                  <option key={n} value={n} />
                ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ash-600" htmlFor="tpl-new-weight">
              Weightage %
            </label>
            <input
              id="tpl-new-weight"
              type="number"
              value={newWeightage}
              onChange={(e) => setNewWeightage(Number(e.target.value) || 0)}
              min={0}
              max={100}
              step={1}
              className="w-24 rounded-md border border-hairline bg-white px-2 py-1.5 text-right text-sm focus-ring"
            />
          </div>
          <button
            type="button"
            onClick={addRow}
            disabled={!newCriterion.trim()}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline px-3 text-xs font-semibold text-ash-700 transition focus-ring",
              "hover:border-ink-400 hover:text-ink-800",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </section>

      {/* Hidden field the server action reads. */}
      <input type="hidden" name="criteria_json" value={criteriaJson} />

      <div className="-mx-1 mt-2 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={cancelHref as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <SaveBtn disabled={!totalOk || rows.length === 0} />
      </div>
    </form>
  );
}

function SaveBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={disabled ? "Add at least one criterion and total weightages to 100 before saving." : undefined}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Save template
        </>
      )}
    </button>
  );
}

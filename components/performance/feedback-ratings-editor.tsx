"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Star, StarOff } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FeedbackRatingsSaveState } from "@/app/(workspace)/hr/performance/actions";
import type { FeedbackRatingRow } from "@/lib/frappe/performance";

type Action = (
  prev: FeedbackRatingsSaveState,
  form: FormData,
) => Promise<FeedbackRatingsSaveState>;
const EMPTY: FeedbackRatingsSaveState = {};

/**
 * Per-criterion rating editor for a Draft Employee Performance Feedback.
 *
 * Each criterion gets:
 *  - a 5-star clickable rating (0-5, half-star not supported here)
 *  - an optional weightage input (must sum to 100 across all rows)
 *
 * The stored value is Frappe's 0.0-1.0 float — the parent's server
 * action divides the 1-5 UI value by 5. Weightages are numbers 0-100.
 */
export function FeedbackRatingsEditor({
  action,
  initialRatings,
}: {
  action: Action;
  initialRatings: FeedbackRatingRow[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [rows, setRows] = useState(
    initialRatings.map((r) => ({
      criteria: r.criteria,
      weightage: r.weightagePercent,
      rating: r.rating,
    })),
  );

  useEffect(() => {
    if (state.success) {
      // Nothing to do — revalidatePath already re-fetched the doc and
      // the parent renders the fresh total score. Just leave the
      // success banner up briefly.
    }
  }, [state.success]);

  const totalWeightage = rows.reduce((acc, r) => acc + (r.weightage || 0), 0);
  const weightageOk = Math.abs(totalWeightage - 100) < 0.5;

  const updateRow = (criteria: string, patch: Partial<{ rating: number; weightage: number }>) => {
    setRows((prev) =>
      prev.map((r) => (r.criteria === criteria ? { ...r, ...patch } : r)),
    );
  };

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ash-500">
        No rating criteria linked to this feedback yet.
      </p>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="flex items-center gap-2 rounded-xl border border-rise/30 bg-rise/[0.06] px-3 py-2 text-xs text-rise">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ratings saved
          {state.totalScore != null && ` — total score ${state.totalScore.toFixed(2)}`}
          .
        </p>
      )}

      <div className="overflow-hidden rounded-card border border-hairline">
        <table className="w-full text-sm">
          <thead className="bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
            <tr>
              <th className="px-3 py-2">Criterion</th>
              <th className="px-3 py-2 w-40 text-right">Weightage %</th>
              <th className="px-3 py-2 w-56">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((r) => (
              <tr key={r.criteria}>
                <td className="px-3 py-3 text-ash-800">{r.criteria}</td>
                <td className="px-3 py-3 text-right">
                  <input
                    type="number"
                    name={`weightage_${r.criteria}`}
                    value={r.weightage}
                    onChange={(e) =>
                      updateRow(r.criteria, {
                        weightage: Number(e.target.value) || 0,
                      })
                    }
                    min={0}
                    max={100}
                    step={1}
                    className="w-24 rounded-md border border-hairline bg-white px-2 py-1.5 text-right text-sm focus-ring"
                  />
                </td>
                <td className="px-3 py-3">
                  <StarPicker
                    value={Math.round(r.rating)}
                    onChange={(v) => updateRow(r.criteria, { rating: v })}
                    name={`rating_${r.criteria}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-hairline bg-canvas/30 text-xs text-ash-600">
            <tr>
              <td className="px-3 py-2 text-right font-medium" colSpan={1}>
                Total weightage
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-semibold",
                  weightageOk ? "text-ash-800" : "text-fall",
                )}
              >
                {totalWeightage.toFixed(0)}%
              </td>
              <td className="px-3 py-2 text-ash-500">
                {weightageOk ? "" : "must total 100"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end">
        <SaveBtn disabled={!weightageOk} />
      </div>
    </form>
  );
}

function StarPicker({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (n: number) => void;
  name: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? 0 : n)}
            aria-label={`${n} out of 5`}
            className="rounded-md p-0.5 text-amber-500 transition hover:scale-110 focus-ring"
          >
            {filled ? <Star className="h-5 w-5 fill-current" /> : <StarOff className="h-5 w-5 opacity-30" />}
          </button>
        );
      })}
      <span className="ml-1 text-xs text-ash-500">{value}/5</span>
    </div>
  );
}

function SaveBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={disabled ? "Weightages must total 100 before saving." : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving…
        </>
      ) : (
        "Save ratings"
      )}
    </button>
  );
}

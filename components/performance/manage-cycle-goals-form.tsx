"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Check } from "lucide-react";
import { GoalPicker, type PickableGoal } from "./goal-picker";
import type { FormState } from "@/app/(workspace)/hr/performance/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

/**
 * Inline goal-roster editor for an existing cycle. Reuses GoalPicker pre-
 * checked with the cycle's current selection. Submit replaces the cycle's
 * `selected_goals` child table atomically.
 */
export function ManageCycleGoalsForm({
  action,
  goals,
  currentlySelected,
}: {
  action: Action;
  goals: PickableGoal[];
  currentlySelected: string[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);

  // No top-level `error` AND no fieldErrors after a submit cycle indicates
  // success. useFormState resets `state` on each submit so we can use the
  // bare absence-of-error check.
  const justSaved =
    state && Object.keys(state).length === 0 && state !== EMPTY;

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}
      {justSaved && (
        <p className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-rise">
          <Check className="h-4 w-4" />
          Goal roster updated.
        </p>
      )}

      <GoalPicker
        goals={goals}
        name="goals"
        initialSelected={currentlySelected}
      />

      <div className="flex justify-end">
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
      className="inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save goal selection"}
    </button>
  );
}

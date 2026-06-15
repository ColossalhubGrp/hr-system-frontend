"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Compass, Layers3, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EvaluationFramework } from "@/lib/frappe/appraisal-framework";

type State = { error?: string; saved?: EvaluationFramework };
type Action = (prev: State, form: FormData) => Promise<State>;
const EMPTY: State = {};

const ICON: Record<EvaluationFramework, React.ComponentType<{ className?: string }>> = {
  "KRA & Goals": Layers3,
  OKR: Target,
  "Balanced Scorecard": Compass,
};

const TAGLINE: Record<EvaluationFramework, string> = {
  "KRA & Goals":
    "Frappe's classic Key Result Area / Goal tree with MBO-style progress.",
  OKR: "Qualitative objective with 2–5 measurable key results; Google 0.0–1.0 grading.",
  "Balanced Scorecard":
    "Strategic objectives across four perspectives — Financial, Customer, Internal Process, Learning & Growth.",
};

/**
 * Three-card chooser that drives `setCycleFrameworkAction`. Submit happens on
 * card click (each is a submit button with a different `framework` value), so
 * the experience is one tap to apply. Optimistic UI: after submit, the
 * `saved` state shows the new pick even before the parent server component
 * re-renders.
 */
export function FrameworkCards({
  action,
  current,
  options,
}: {
  action: Action;
  current: EvaluationFramework;
  options: readonly EvaluationFramework[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const active = state.saved ?? current;

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      {state.saved && !state.error && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-rise"
        >
          <CheckCircle2 className="h-4 w-4" />
          Framework set to {state.saved}. Performance pages reflect it now.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map((opt) => (
          <Choice key={opt} value={opt} active={active === opt} />
        ))}
      </div>
    </form>
  );
}

function Choice({
  value,
  active,
}: {
  value: EvaluationFramework;
  active: boolean;
}) {
  const { pending } = useFormStatus();
  const Icon = ICON[value];
  return (
    <button
      type="submit"
      name="framework"
      value={value}
      disabled={pending}
      className={cn(
        "group rounded-card border p-4 text-left transition focus-ring",
        active
          ? "border-ink-300 bg-ink-50/70 ring-1 ring-ink-200"
          : "border-hairline bg-surface hover:border-ink-200 hover:bg-canvas",
        pending && "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-2 text-ink-800">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-semibold">{value}</span>
        {active && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-chip bg-ink-800 px-2 py-0.5 text-[10px] font-medium text-white">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ash-600">
        {TAGLINE[value]}
      </p>
    </button>
  );
}

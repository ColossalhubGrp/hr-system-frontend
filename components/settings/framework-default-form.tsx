"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import type { PerformanceSettingsState } from "@/app/(workspace)/settings/performance/actions";

type Action = (
  prev: PerformanceSettingsState,
  form: FormData,
) => Promise<PerformanceSettingsState>;

const FRAMEWORKS = ["KRA & Goals", "OKR", "Balanced Scorecard"] as const;
const EMPTY: PerformanceSettingsState = {};

const COPY: Record<(typeof FRAMEWORKS)[number], string> = {
  "KRA & Goals":
    "Tightly coupled to job description — each KRA cascades into goals.",
  OKR: "Objective with 3–5 measurable key results, scored 0.0–1.0 each.",
  "Balanced Scorecard":
    "Strategic objectives across four perspectives (Financial, Customer, Internal Process, Learning & Growth).",
};

export function FrameworkDefaultForm({
  action,
  initial,
}: {
  action: Action;
  initial: (typeof FRAMEWORKS)[number];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        {FRAMEWORKS.map((f) => {
          const checked = (state.saved ?? initial) === f;
          return (
            <label
              key={f}
              className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 transition ${
                checked
                  ? "border-ink-800 bg-ink-50/40"
                  : "border-hairline bg-surface hover:bg-canvas"
              }`}
            >
              <input
                type="radio"
                name="framework"
                value={f}
                defaultChecked={initial === f}
                className="mt-1 h-4 w-4 accent-ink-800"
              />
              <div>
                <p className="font-semibold text-ink-800">{f}</p>
                <p className="text-xs text-ash-600">{COPY[f]}</p>
              </div>
            </label>
          );
        })}
      </fieldset>

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall">
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="flex items-center gap-2 rounded-xl border border-rise/30 bg-rise/[0.06] px-3 py-2 text-xs text-rise">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Default set to {state.saved}. New cycles will pre-select this.
        </p>
      )}

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
      className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save default"}
    </button>
  );
}

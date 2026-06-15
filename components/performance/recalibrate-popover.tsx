"use client";

import { useState, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowUpDown, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { Band } from "@/lib/frappe/calibration";
import type { CalibrationState } from "@/app/(workspace)/hr/performance/calibration/actions";

type Action = (
  prev: CalibrationState,
  form: FormData,
) => Promise<CalibrationState>;

const EMPTY: CalibrationState = {};
const BANDS: Band[] = ["Low", "Medium", "High"];

/**
 * Click-to-edit popover used inside a 9-box cell. Anchored to its trigger
 * chip; commits a single field (potential rating) and lets the cycle picker
 * page revalidate.
 *
 * Performance band is read-only here — to change it, HR edits the Appraisal
 * `final_score` via the existing appraisal detail page (which is the source
 * of truth for the performance axis).
 */
export function RecalibratePopover({
  action,
  appraisalId,
  employeeName,
  currentPotential,
  performanceLabel,
  finalScore,
  canEdit,
}: {
  action: Action;
  appraisalId: string;
  employeeName: string;
  currentPotential: Band;
  performanceLabel: string;
  finalScore: number;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Click-outside to dismiss.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-1 truncate rounded-chip border border-hairline bg-surface px-2 py-1 text-[11px] font-medium text-ink-800 transition hover:border-ink-300 hover:bg-canvas focus-ring"
        aria-expanded={open}
        title={canEdit ? "Click to recalibrate" : "View only"}
      >
        <span className="truncate max-w-[120px]">{employeeName}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-card border border-hairline bg-surface p-3 shadow-xl">
          <PopoverContent
            action={action}
            appraisalId={appraisalId}
            employeeName={employeeName}
            currentPotential={currentPotential}
            performanceLabel={performanceLabel}
            finalScore={finalScore}
            canEdit={canEdit}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function PopoverContent({
  action,
  appraisalId,
  employeeName,
  currentPotential,
  performanceLabel,
  finalScore,
  canEdit,
  onClose,
}: {
  action: Action;
  appraisalId: string;
  employeeName: string;
  currentPotential: Band;
  performanceLabel: string;
  finalScore: number;
  canEdit: boolean;
  onClose: () => void;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);

  // Close shortly after a successful save so HR can move to the next chip.
  useEffect(() => {
    if (state.saved) {
      const t = setTimeout(onClose, 800);
      return () => clearTimeout(t);
    }
  }, [state.saved, onClose]);

  return (
    <form action={dispatch} className="flex flex-col gap-2 text-sm">
      <header className="flex items-start justify-between gap-2 pb-1">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{employeeName}</p>
          <p className="text-[11px] text-ash-500">
            {appraisalId} · score {finalScore.toFixed(1)} ({performanceLabel})
          </p>
        </div>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ash-500">
          Potential
        </span>
        <div className="flex gap-1">
          {BANDS.map((b) => {
            const selected = (state.saved ?? currentPotential) === b;
            return (
              <label
                key={b}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-chip border px-2 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-ink-800 bg-ink-800 text-white"
                    : "border-hairline bg-surface text-ash-700 hover:bg-canvas"
                } ${canEdit ? "" : "opacity-60 cursor-not-allowed"}`}
              >
                <input
                  type="radio"
                  name="potential"
                  value={b}
                  defaultChecked={currentPotential === b}
                  disabled={!canEdit}
                  className="sr-only"
                />
                {b}
              </label>
            );
          })}
        </div>
      </label>

      {state.error && (
        <p className="flex items-center gap-1 rounded-md border border-fall/30 bg-fall/[0.06] px-2 py-1 text-[11px] text-fall">
          <AlertCircle className="h-3 w-3" />
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="flex items-center gap-1 rounded-md border border-rise/30 bg-rise/[0.06] px-2 py-1 text-[11px] text-rise">
          <CheckCircle2 className="h-3 w-3" />
          Saved as {state.saved}.
        </p>
      )}

      <p className="rounded-md bg-canvas/60 px-2 py-1.5 text-[11px] text-ash-500">
        To change the <strong>performance</strong> axis, edit{" "}
        <code>final_score</code> on the appraisal itself.
      </p>

      {canEdit && <Submit />}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex h-8 items-center justify-center gap-1 rounded-chip bg-ink-800 px-3 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <ArrowUpDown className="h-3 w-3" />
          Save calibration
        </>
      )}
    </button>
  );
}

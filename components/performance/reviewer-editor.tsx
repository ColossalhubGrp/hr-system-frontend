"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Pencil, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ApproverPickerField } from "@/components/common/approver-picker-field";
import type { EmployeeDirectoryEntry } from "@/components/common/employee-picker-field";
import type { StdFormState } from "@/lib/frappe/form-errors";

type Action = (
  prev: StdFormState,
  form: FormData,
) => Promise<StdFormState>;
const EMPTY: StdFormState = {};

/**
 * Small inline editor for the Reviewer field on an Appraisal detail
 * page. Renders the current value as read-only text with a Change
 * button; opens an inline picker on click; saves via the bound
 * server action.
 *
 * HR admin only — the parent decides visibility.
 */
export function ReviewerEditor({
  action,
  currentReviewer,
  currentReviewerName,
  directory,
}: {
  action: Action;
  currentReviewer: string | null;
  currentReviewerName: string | null;
  directory: EmployeeDirectoryEntry[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, dispatch] = useFormState(action, EMPTY);

  const display = currentReviewerName
    ? currentReviewer
      ? `${currentReviewerName} (${currentReviewer})`
      : currentReviewerName
    : currentReviewer || "—";

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-ash-800">{display}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-7 items-center gap-1 rounded-chip border border-hairline px-2 text-xs text-ash-600 transition hover:bg-canvas hover:text-ash-800 focus-ring"
        >
          <Pencil className="h-3 w-3" />
          Change
        </button>
      </div>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-2">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-fall/30 bg-fall/[0.06] px-2 py-1.5 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      <ApproverPickerField
        name="reviewer"
        label="Reviewer"
        directory={directory}
        defaultValue={currentReviewer ?? ""}
        placeholder="Select reviewer"
      />

      <div className="flex items-center gap-2">
        <SaveBtn />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex h-8 items-center gap-1 rounded-chip px-3 text-xs text-ash-700 transition hover:bg-canvas focus-ring"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </form>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-chip bg-ink-800 px-3 text-xs font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Check className="h-3 w-3" />
          Save
        </>
      )}
    </button>
  );
}

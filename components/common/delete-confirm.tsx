"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

type State = { error?: string };
type Action = (prev: State) => Promise<State>;
const EMPTY: State = {};

/**
 * Two-click destructive panel.
 *
 * First click flips the panel into a confirm state with an explicit
 * "Yes, delete" button next to a Cancel. The Server Action only runs on the
 * second click, so a single mis-click can't lose data. Frappe errors come
 * back through `useFormState` and render inline instead of bubbling to the
 * page.
 */
export function DeleteConfirm({
  title,
  description,
  confirmTitle,
  confirmDescription,
  label = "Delete",
  pendingLabel = "Deleting…",
  action,
}: {
  title: string;
  description?: string;
  /** Override for the confirm step's panel heading. */
  confirmTitle?: string;
  confirmDescription?: string;
  label?: string;
  pendingLabel?: string;
  action: Action;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-fall/30 bg-fall/[0.03] p-4 shadow-card">
      <div>
        <p className="text-sm font-medium text-fall">
          {armed ? (confirmTitle ?? title) : title}
        </p>
        <p className="text-xs text-ash-600">
          {armed
            ? (confirmDescription ??
              "This can't be undone. Click again to confirm.")
            : description}
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded-chip border border-fall/40 bg-surface px-4 text-sm font-semibold text-fall transition hover:bg-fall/[0.06] focus-ring"
        >
          <Trash2 className="h-4 w-4" />
          {label}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <form action={dispatch}>
            <ConfirmBtn pendingLabel={pendingLabel}>
              <Trash2 className="h-4 w-4" />
              Yes, {label.toLowerCase()}
            </ConfirmBtn>
          </form>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="inline-flex h-10 items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmBtn({
  pendingLabel,
  children,
}: {
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip bg-fall px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-fall/90 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

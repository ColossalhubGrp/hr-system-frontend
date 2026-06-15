"use client";

import { useState, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserMinus,
  X,
} from "lucide-react";
import type { ConvertToAlumniState } from "@/app/(workspace)/employee/[id]/actions";

type Action = (
  prev: ConvertToAlumniState,
  form: FormData,
) => Promise<ConvertToAlumniState>;

const EMPTY: ConvertToAlumniState = {};

/**
 * "Convert to Alumni" — danger-zone action on the employee detail page,
 * gated to HR Director / IT Admin / HR Manager. Stripping active workforce
 * roles is hard-to-reverse, so we wrap it in a confirm dialog with explicit
 * relieving-date input and a summary of what will happen.
 *
 * On success: shows the role transition + the new alumni portal URL so the
 * admin can copy a sign-in invite into an email.
 */
export function ConvertToAlumniButton({
  action,
  employeeId,
  employeeName,
  linkedUser,
  currentStatus,
  defaultRelievingDate,
}: {
  action: Action;
  employeeId: string;
  employeeName: string;
  /** Linked User.email, or null if the employee has no user account. */
  linkedUser: string | null;
  currentStatus: string | null;
  /** Pre-fill the relieving-date input. ISO YYYY-MM-DD. */
  defaultRelievingDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useFormState(action, EMPTY);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape; close on backdrop click.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const alreadyAlumni =
    !!state.saved &&
    state.saved.rolesAfter.length === 1 &&
    state.saved.rolesAfter[0] === "Alumni";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-fall/40 px-3 text-xs font-semibold text-fall transition hover:bg-fall/5 focus-ring"
        disabled={currentStatus === "Left"}
        title={
          currentStatus === "Left"
            ? "This employee is already marked as Left."
            : "Convert to Alumni — strips active access and grants the alumni portal."
        }
      >
        <UserMinus className="h-3.5 w-3.5" />
        Convert to Alumni
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-labelledby="convert-alumni-title"
            className="w-full max-w-lg rounded-card border border-hairline bg-surface shadow-xl"
          >
            <header className="flex items-start justify-between border-b border-hairline px-5 py-4">
              <div>
                <h2
                  id="convert-alumni-title"
                  className="text-base font-semibold text-ink-900"
                >
                  Convert {employeeName} to Alumni?
                </h2>
                <p className="mt-0.5 text-xs text-ash-500">
                  {employeeId}
                  {linkedUser ? ` · ${linkedUser}` : " · No linked user account"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-chip p-1 text-ash-500 hover:bg-canvas focus-ring"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="px-5 py-4 text-sm text-ash-700">
              <p className="mb-3">
                This will, in one atomic update:
              </p>
              <ul className="mb-4 ml-1 flex flex-col gap-1.5 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fall" />
                  <span>
                    Set <strong>Employee status</strong> to{" "}
                    <span className="rounded-chip bg-fall/10 px-1.5 py-0.5 text-[11px] font-medium text-fall">
                      Left
                    </span>{" "}
                    and write the relieving date below.
                  </span>
                </li>
                {linkedUser && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fall" />
                      <span>
                        <strong>Strip every role</strong> on{" "}
                        <code className="rounded bg-canvas px-1 text-xs">
                          {linkedUser}
                        </code>{" "}
                        (Employee, Line Manager, HR, etc.) and grant only{" "}
                        <span className="rounded-chip bg-ink-50 px-1.5 py-0.5 text-[11px] font-medium text-ink-800">
                          Alumni
                        </span>
                        .
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fall" />
                      <span>
                        They sign in via{" "}
                        <code className="rounded bg-canvas px-1 text-xs">
                          /alumni/login
                        </code>{" "}
                        and land on a read-only history portal — no access to{" "}
                        <code className="rounded bg-canvas px-1 text-xs">/me</code>,{" "}
                        <code className="rounded bg-canvas px-1 text-xs">/hr</code>{" "}
                        or any other surface.
                      </span>
                    </li>
                  </>
                )}
                {!linkedUser && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    <span>
                      No user account is linked to this employee — only the
                      employee record will change. If you later create a user
                      with this email, remember to assign the Alumni role manually.
                    </span>
                  </li>
                )}
              </ul>
              <p className="mb-3 text-xs text-ash-500">
                To undo, edit roles via <code>/settings/users</code> — strip
                Alumni and re-add the employee's active roles.
              </p>

              <form action={dispatch} className="flex flex-col gap-3">
                <label htmlFor="relieving_date" className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ash-700">
                    Relieving date
                  </span>
                  <input
                    id="relieving_date"
                    name="relieving_date"
                    type="date"
                    defaultValue={defaultRelievingDate}
                    className="h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
                  />
                </label>

                {state.error && (
                  <p className="flex items-start gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{state.error}</span>
                  </p>
                )}

                {state.saved && (
                  <div className="rounded-xl border border-rise/30 bg-rise/[0.06] px-3 py-2 text-xs text-rise">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Conversion complete.
                    </p>
                    {state.saved.user && (
                      <p className="mt-1 text-rise/90">
                        Roles on {state.saved.user}:{" "}
                        <code className="rounded bg-canvas px-1 text-rise">
                          {state.saved.rolesBefore.join(", ") || "(none)"}
                        </code>
                        {" → "}
                        <code className="rounded bg-canvas px-1 text-rise">
                          {state.saved.rolesAfter.join(", ")}
                        </code>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 rounded-chip border border-hairline px-3 text-xs font-medium text-ash-700 hover:bg-canvas focus-ring"
                  >
                    {alreadyAlumni ? "Close" : "Cancel"}
                  </button>
                  {!alreadyAlumni && (
                    <SubmitButton />
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-fall px-4 text-xs font-semibold text-white transition hover:bg-fall/90 focus-ring disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Converting…
        </>
      ) : (
        <>
          <UserMinus className="h-3.5 w-3.5" />
          Convert to Alumni
        </>
      )}
    </button>
  );
}

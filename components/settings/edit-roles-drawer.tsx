"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Pencil, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { setUserRolesAction } from "@/app/(workspace)/settings/users/actions";

type Props = {
  /** Email / user id of the user being edited. */
  userEmail: string;
  /** Display name for the drawer header. */
  fullName: string | null;
  /** Roles currently held by the user. */
  current: string[];
  /** Every role available to assign (filtered to SRS-relevant ones). */
  available: string[];
};

/**
 * Slide-over panel for assigning roles to a user. Initial selection mirrors
 * the user's current roles; on save, sends the full desired set to the
 * Server Action which replaces the role list atomically.
 */
export function EditRolesDrawer({
  userEmail,
  fullName,
  current,
  available,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(current));
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Reset selection whenever the drawer re-opens — current may have shifted.
  useEffect(() => {
    if (open) {
      setSelected(new Set(current));
      setErr(null);
      setOkMsg(null);
    }
  }, [open, current]);

  function toggle(role: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  }

  function onSave() {
    setErr(null);
    setOkMsg(null);
    start(async () => {
      const res = await setUserRolesAction(userEmail, [...selected]);
      if ("ok" in res && res.ok) {
        setOkMsg("Roles updated.");
        setTimeout(() => setOpen(false), 600);
      } else if ("error" in res) {
        setErr(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-chip border border-hairline px-2 py-0.5 text-[11px] font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between border-b border-hairline p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-ash-500">
                  Edit roles
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-ink-900">
                  {fullName ?? userEmail}
                </h2>
                <p className="text-xs text-ash-500">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                className="rounded-chip p-1 text-ash-500 hover:bg-canvas focus-ring disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-xs text-ash-600">
                Roles control what this user can see + do across HR, payroll,
                analytics, audit and the alumni portal. Backend DocPerms also
                enforce these at the data layer.
              </p>
              <ul className="flex flex-col gap-1">
                {available.map((role) => {
                  const isOn = selected.has(role);
                  return (
                    <li key={role}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline px-3 py-2 text-sm transition hover:bg-canvas">
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => toggle(role)}
                          disabled={pending}
                          className="h-4 w-4 accent-ink-800"
                        />
                        <span className="flex-1 font-medium text-ink-800">
                          {role}
                        </span>
                        {current.includes(role) && (
                          <span className="rounded-chip bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink-800">
                            current
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <footer className="flex flex-col gap-2 border-t border-hairline p-5">
              {err && (
                <p className="flex items-start gap-1.5 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{err}</span>
                </p>
              )}
              {okMsg && (
                <p className="flex items-center gap-1.5 rounded-xl border border-rise/30 bg-rise/[0.06] px-3 py-2 text-xs text-rise">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {okMsg}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !pending && setOpen(false)}
                  disabled={pending}
                  className="h-9 rounded-chip border border-hairline px-3 text-xs font-medium text-ash-700 hover:bg-canvas focus-ring disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

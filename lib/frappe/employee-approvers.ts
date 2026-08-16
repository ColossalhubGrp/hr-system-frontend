import "server-only";

import { frappeCall, FrappeRequestError } from "./client";

/**
 * Resolve an approver picker's posted value to a Frappe user_id (email).
 *
 * The picker in `components/common/approver-picker-field.tsx` shows every
 * employee and posts the picked employee's id. Frappe's Approver fields
 * are Link-to-User under the hood, so at submit time we look up (or
 * lazily create) the employee's linked user account and return its email.
 *
 * The heavy lifting lives in the backend whitelisted method
 * `recruitment_app.api.me.ensure_user_for_employee`, which runs with
 * `ignore_permissions=True` so HR filers don't need raw User.create
 * rights. Everything the frontend needs is a single call.
 *
 * Return shape:
 *   - `{ ok: true, userId }` — good to submit
 *   - `{ ok: false, reason: "no_email" }` — employee has neither a
 *     company nor personal email; caller should surface a targeted
 *     field error asking the user to add one first.
 *   - `{ ok: false, reason: "not_found" }` — the id doesn't match
 *     any Employee (stale directory).
 *   - `{ ok: false, reason: "provision_failed", detail }` — the
 *     backend method threw for some other reason (permission,
 *     validation). `detail` carries the Frappe message.
 *
 * Values already containing "@" (verbatim options like Administrator,
 * ex-employees kept for archival) pass through unchanged.
 */
export type ApproverResolution =
  | { ok: true; userId: string }
  | {
      ok: false;
      reason: "no_email" | "not_found" | "provision_failed";
      detail?: string;
    };

/** Discriminate the specific "no email on record" case out of Frappe's
 *  ValidationError so the caller can render the specific message. The
 *  backend produces the exact prefix `<name> has no email on their
 *  employee record.` for this failure. */
function isNoEmailError(msg: string): boolean {
  return /has no email on their employee record/i.test(msg);
}

/** Discriminate the "Employee X not found" case. */
function isNotFoundError(msg: string): boolean {
  return /Employee\s+\S+\s+not found/i.test(msg);
}

/** Best-effort extraction of Frappe's own error message from a
 *  FrappeRequestError. Frappe surfaces validation errors through
 *  `_server_messages` — a double-JSON-encoded list of `{message, title}`.
 *  Falls back to the raw exception message when parsing fails. */
function frappeErrorMessage(err: FrappeRequestError): string {
  const detail = err.detail as
    | { _server_messages?: string; message?: string; exception?: string }
    | undefined;
  if (detail?._server_messages) {
    try {
      const arr = JSON.parse(detail._server_messages) as string[];
      const first = arr[0]
        ? (JSON.parse(arr[0]) as { message?: string })
        : undefined;
      if (first?.message) return stripHtml(first.message);
    } catch {
      /* fall through */
    }
  }
  return stripHtml(detail?.message ?? detail?.exception ?? err.message);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export async function resolveApproverUserId(
  input: string | null | undefined,
): Promise<ApproverResolution | null> {
  const val = (input ?? "").trim();
  if (!val) return null;
  // Already an email — passed through as-is (verbatim option in picker).
  if (val.includes("@")) return { ok: true, userId: val };

  // Employee id — hand it to the backend which will lazily create a
  // User account if needed and link it back to the Employee record.
  try {
    const res = await frappeCall<{ user_id: string }>({
      method: "recruitment_app.api.me.ensure_user_for_employee",
      args: { employee: val },
      verb: "POST",
      as: "user",
    });
    return { ok: true, userId: res.user_id };
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      const msg = frappeErrorMessage(err);
      if (isNoEmailError(msg)) {
        return { ok: false, reason: "no_email" };
      }
      if (isNotFoundError(msg)) {
        return { ok: false, reason: "not_found" };
      }
      return { ok: false, reason: "provision_failed", detail: msg };
    }
    return {
      ok: false,
      reason: "provision_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Friendly message paired with an ApproverResolution failure. Use in
 *  the calling action's fieldErrors for the approver / reviewer field.
 *  When `detail` is provided (provision_failed branch), the underlying
 *  Frappe message is included so users see something actionable
 *  instead of a generic "something went wrong". */
export function approverErrorMessage(
  reason: "no_email" | "not_found" | "provision_failed",
  label = "approver",
  detail?: string,
): string {
  if (reason === "no_email") {
    return `The picked ${label} has no email on their employee record, so we can't set up a login for them. Add a company or personal email under Contact Details first.`;
  }
  if (reason === "provision_failed") {
    return `Couldn't set up a login for the picked ${label}${detail ? ` — ${detail}` : "."}`;
  }
  return `Couldn't find that ${label}. Refresh and pick again.`;
}

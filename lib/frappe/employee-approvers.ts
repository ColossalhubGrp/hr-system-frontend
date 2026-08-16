import "server-only";

import { frappeCall } from "./client";

/**
 * Resolve an approver picker's posted value to a Frappe user_id (email).
 *
 * The picker in `components/common/approver-picker-field.tsx` shows every
 * employee and posts the picked employee's id. Frappe's Approver fields
 * are Link-to-User under the hood, so at submit time we look up the
 * employee's linked user account and use its email as the actual value
 * stored on the doc (that's where notifications go).
 *
 * Return shape:
 *   - `{ ok: true, userId }` — good to submit
 *   - `{ ok: false, reason: "no_user" }` — picked employee has no linked
 *     user account; caller should surface a targeted field error asking
 *     the user to add one first
 *   - `{ ok: false, reason: "not_found" }` — the id doesn't match any
 *     Employee (shouldn't happen from the picker, but guards against a
 *     stale directory)
 *
 * Values that already look like emails (they contain "@") are passed
 * through unchanged — that covers pre-existing docs where an
 * Administrator / ex-employee / integration user was stored, and the
 * picker rendered it as a verbatim option.
 */
export type ApproverResolution =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_user" | "not_found" };

export async function resolveApproverUserId(
  input: string | null | undefined,
): Promise<ApproverResolution | null> {
  const val = (input ?? "").trim();
  if (!val) return null;
  // Already an email — passed through as-is (verbatim option in picker).
  if (val.includes("@")) return { ok: true, userId: val };
  // Employee id — look up user_id.
  try {
    const row = await frappeCall<{ user_id: string | null } | Array<never> | null>({
      method: "frappe.client.get_value",
      args: {
        doctype: "Employee",
        filters: { name: val },
        fieldname: "user_id",
      },
      as: "user",
    });
    // frappe.client.get_value returns `{}` (empty dict) when the filter
    // matches no row — treat that as not-found.
    const userId =
      row && typeof row === "object" && !Array.isArray(row)
        ? (row.user_id ?? "").trim()
        : "";
    if (!userId) {
      // Row exists but user_id is empty → needs a linked user account.
      // Distinguish that from row-not-found by re-checking existence.
      const exists = await frappeCall<{ name: string } | Array<never> | null>({
        method: "frappe.client.get_value",
        args: {
          doctype: "Employee",
          filters: { name: val },
          fieldname: "name",
        },
        as: "user",
      }).catch(() => null);
      const hasRow =
        exists && typeof exists === "object" && !Array.isArray(exists) && "name" in exists;
      return hasRow
        ? { ok: false, reason: "no_user" }
        : { ok: false, reason: "not_found" };
    }
    return { ok: true, userId };
  } catch {
    return { ok: false, reason: "not_found" };
  }
}

/** Friendly message paired with an ApproverResolution failure. Use in
 *  the calling action's fieldErrors for the approver / reviewer field. */
export function approverErrorMessage(
  reason: "no_user" | "not_found",
  label = "approver",
): string {
  if (reason === "no_user") {
    return `The picked ${label} needs a linked user account before they can be assigned. Add one in People first.`;
  }
  return `Couldn't find that ${label}. Refresh and pick again.`;
}

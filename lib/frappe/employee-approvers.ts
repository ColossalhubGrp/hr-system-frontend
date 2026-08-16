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
 * When the picked employee has no linked user account yet, we
 * auto-provision one on demand using their company_email (or
 * personal_email as fallback), then link it back to the Employee.
 * Under the model the user asked for — "every employee IS also a
 * user" — the picker just works instead of forcing the filer to
 * abandon the flow and set up a login separately. Requires the
 * FRAPPE_API key (System Manager) since regular users can't insert
 * User docs; that's why we `as: "service"` for the create step.
 *
 * Return shape:
 *   - `{ ok: true, userId }` — good to submit
 *   - `{ ok: false, reason: "no_email" }` — employee has neither a
 *     company nor personal email, so we can't create a login. The
 *     filer should add one on the Employee record first.
 *   - `{ ok: false, reason: "not_found" }` — the id doesn't match
 *     any Employee (stale directory).
 *
 * Values that already look like emails (they contain "@") are passed
 * through unchanged — that covers pre-existing docs where an
 * Administrator / ex-employee / integration user was stored, and the
 * picker rendered it as a verbatim option.
 */
export type ApproverResolution =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_email" | "not_found" | "provision_failed"; detail?: string };

type EmployeeContactRow = {
  user_id: string | null;
  company_email: string | null;
  personal_email: string | null;
  employee_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

async function loadEmployeeContact(
  employeeId: string,
): Promise<EmployeeContactRow | null> {
  try {
    const row = await frappeCall<EmployeeContactRow | Array<never> | null>({
      method: "frappe.client.get_value",
      args: {
        doctype: "Employee",
        filters: { name: employeeId },
        fieldname: [
          "user_id",
          "company_email",
          "personal_email",
          "employee_name",
          "first_name",
          "last_name",
        ],
      },
      as: "user",
    });
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    // frappe.client.get_value returns `{}` when the filter matches
    // no row — treat that as not-found.
    if (Object.keys(row).length === 0) return null;
    return row;
  } catch {
    return null;
  }
}

async function findUserByEmail(email: string): Promise<boolean> {
  try {
    const row = await frappeCall<{ name: string } | Array<never> | null>({
      method: "frappe.client.get_value",
      args: {
        doctype: "User",
        filters: { name: email },
        fieldname: "name",
      },
      as: "service",
    });
    return Boolean(
      row && typeof row === "object" && !Array.isArray(row) && "name" in row,
    );
  } catch {
    return false;
  }
}

async function createUserAccount(
  email: string,
  emp: EmployeeContactRow,
): Promise<void> {
  const firstName =
    (emp.first_name ?? "").trim() ||
    (emp.employee_name ?? "").trim().split(/\s+/)[0] ||
    "Employee";
  const lastName =
    (emp.last_name ?? "").trim() ||
    (emp.employee_name ?? "").trim().split(/\s+/).slice(1).join(" ") ||
    "-";
  await frappeCall({
    method: "frappe.client.insert",
    args: {
      doc: {
        doctype: "User",
        // User is auto-named after `email` in Frappe. Setting `name`
        // explicitly avoids any locale-specific autoname wrinkles.
        name: email,
        email,
        first_name: firstName,
        last_name: lastName,
        // Admin can invite them later; auto-emailing on every approver
        // pick would spam mailboxes (and would fail on non-deliverable
        // demo domains, sinking the whole insert).
        send_welcome_email: 0,
        enabled: 1,
        // System User so they can log in and act on approvals.
        // Website User wouldn't have desk access.
        user_type: "System User",
        // Frappe requires at least one role on a System User; without
        // this the insert succeeds but subsequent Link-to-User lookups
        // can still refuse the row depending on tenant-wide validation.
        // "Employee" is the safe minimum — the Employee role bundle
        // comes with the tenant seed on this app.
        roles: [{ doctype: "Has Role", role: "Employee" }],
      },
    },
    verb: "POST",
    as: "service",
  });
}

async function linkUserToEmployee(
  employeeId: string,
  email: string,
): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    args: {
      doctype: "Employee",
      name: employeeId,
      fieldname: { user_id: email },
    },
    verb: "POST",
    as: "service",
  });
}

export async function resolveApproverUserId(
  input: string | null | undefined,
): Promise<ApproverResolution | null> {
  const val = (input ?? "").trim();
  if (!val) return null;
  // Already an email — passed through as-is (verbatim option in picker).
  if (val.includes("@")) return { ok: true, userId: val };

  // Employee id — look up user_id, auto-provision if missing.
  const emp = await loadEmployeeContact(val);
  if (!emp) return { ok: false, reason: "not_found" };

  const linked = (emp.user_id ?? "").trim();
  if (linked) return { ok: true, userId: linked };

  const email =
    (emp.company_email ?? "").trim() || (emp.personal_email ?? "").trim();
  if (!email) return { ok: false, reason: "no_email" };

  // Provision the account. If a User already exists at that address
  // (someone set it up out-of-band), skip the insert and just link
  // it back to the Employee. Errors on the create bubble up as a
  // targeted "provision_failed" so the caller surfaces something
  // actionable instead of the picker's success turning into
  // Frappe's cryptic "Could not find Approver: <email>" later.
  const alreadyExists = await findUserByEmail(email);
  if (!alreadyExists) {
    try {
      await createUserAccount(email, emp);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err ?? "unknown error");
      return { ok: false, reason: "provision_failed", detail: msg };
    }
  }
  // Best-effort link — the value we return is the User's email,
  // which Frappe will accept whether or not it's linked back to
  // this Employee record. Failure here is worth logging but not
  // worth failing the whole request over.
  try {
    await linkUserToEmployee(val, email);
  } catch {
    /* non-fatal */
  }
  return { ok: true, userId: email };
}

/** Friendly message paired with an ApproverResolution failure. Use in
 *  the calling action's fieldErrors for the approver / reviewer field.
 *  Callers can pass the resolution's `detail` field so the underlying
 *  Frappe error (missing role, duplicate email, etc.) reaches the
 *  user instead of a generic "something went wrong". */
export function approverErrorMessage(
  reason: "no_email" | "not_found" | "provision_failed",
  label = "approver",
  detail?: string,
): string {
  if (reason === "no_email") {
    return `The picked ${label} has no email on their employee record, so we can't set up a login for them. Add a company or personal email under Contact Details first.`;
  }
  if (reason === "provision_failed") {
    return `Couldn't create a login account for the picked ${label}${detail ? ` — ${detail}` : "."}`;
  }
  return `Couldn't find that ${label}. Refresh and pick again.`;
}

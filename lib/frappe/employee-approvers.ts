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
  | { ok: false; reason: "no_email" | "not_found" };

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
        email,
        first_name: firstName,
        last_name: lastName,
        // Admin can invite them later; auto-emailing on every approver
        // pick would spam mailboxes and reveal the mechanism.
        send_welcome_email: 0,
        enabled: 1,
        // System User so they can log in and act on approvals.
        // Website User wouldn't have desk access.
        user_type: "System User",
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
  // (someone set it up out-of-band), skip the insert and just link it
  // back to the Employee.
  const alreadyExists = await findUserByEmail(email);
  if (!alreadyExists) {
    try {
      await createUserAccount(email, emp);
    } catch {
      // Fall through — the link step below will still fail loudly if
      // Frappe never got the User created.
    }
  }
  try {
    await linkUserToEmployee(val, email);
  } catch {
    // If linking fails, the calling action will still see ok:true and
    // send `email` to Frappe. Frappe's Link-to-User validation will
    // accept it as long as the User exists (which we just ensured).
  }
  return { ok: true, userId: email };
}

/** Friendly message paired with an ApproverResolution failure. Use in
 *  the calling action's fieldErrors for the approver / reviewer field. */
export function approverErrorMessage(
  reason: "no_email" | "not_found",
  label = "approver",
): string {
  if (reason === "no_email") {
    return `The picked ${label} has no email on their employee record, so we can't set up a login for them. Add a company or personal email under Contact Details first.`;
  }
  return `Couldn't find that ${label}. Refresh and pick again.`;
}

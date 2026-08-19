import "server-only";
import { FrappeRequestError, frappeCall } from "./client";
import type { LifecycleKind } from "./lifecycle";

/**
 * Per-kind metadata for the five lifecycle workflows. Each entry pins the
 * Frappe doctype name and how that doctype carries its status — `boarding`
 * doctypes use a Select field, the `submittable` ones use docstatus, and
 * Grievance uses a plain Select.
 */
type KindMeta = {
  doctype: string;
  workflow: "boarding" | "submittable" | "grievance";
};

const KIND_META: Record<LifecycleKind, KindMeta> = {
  onboarding: { doctype: "Employee Onboarding", workflow: "boarding" },
  separation: { doctype: "Employee Separation", workflow: "boarding" },
  transfer: { doctype: "Employee Transfer", workflow: "submittable" },
  promotion: { doctype: "Employee Promotion", workflow: "submittable" },
  grievance: { doctype: "Employee Grievance", workflow: "grievance" },
};

// ----------------------------------------------------------- read one ----

export type LifecycleRecord = {
  id: string;
  doctype: string;
  kind: LifecycleKind;
  employee: string;
  employeeName: string | null;
  company: string | null;
  department: string | null;
  designation: string | null;
  docstatus: 0 | 1 | 2;
  /** "Pending" / "In Process" / "Completed" for boarding, "Open" / "Investigated" / "Resolved" / "Invalid" for grievance, "Draft"/"Submitted"/"Cancelled" derived for submittable. */
  status: string;
  /** Free-form payload — every doc carries different fields. Renderers pick what's relevant. */
  raw: Record<string, unknown>;
};

export async function getLifecycleRecord(
  kind: LifecycleKind,
  id: string,
): Promise<LifecycleRecord | null> {
  const meta = KIND_META[kind];
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      args: { doctype: meta.doctype, name: id },
      as: "user",
    });
    return {
      id: String(doc.name),
      doctype: meta.doctype,
      kind,
      employee: String(doc.employee ?? ""),
      employeeName: (doc.employee_name as string | null) ?? null,
      company: (doc.company as string | null) ?? null,
      department: (doc.department as string | null) ?? null,
      designation: (doc.designation as string | null) ?? null,
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      status: pickStatus(kind, doc),
      raw: doc,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

function pickStatus(
  kind: LifecycleKind,
  d: Record<string, unknown>,
): string {
  switch (kind) {
    case "onboarding":
      return (d.boarding_status as string) ?? "Pending";
    case "separation":
      // Employee Separation uses `status`, not `boarding_status`.
      return (d.status as string) ?? "Pending";
    case "grievance":
      return (d.status as string) ?? "Open";
    case "transfer":
    case "promotion":
      return Number(d.docstatus) === 2
        ? "Cancelled"
        : Number(d.docstatus) === 1
          ? "Submitted"
          : "Draft";
  }
}

// ----------------------------------------------------------- create ----

export type OnboardingInput = {
  employee: string;
  boarding_begins_on: string;
  company: string;
  department?: string;
  designation?: string;
  employee_grade?: string;
};

export type SeparationInput = {
  employee: string;
  /** Frappe HR's Employee Separation uses `separation_begins_on`, not
   *  `boarding_begins_on` — we keep the form-side label intact and map. */
  boarding_begins_on: string;
  company: string;
  department?: string;
  designation?: string;
  resignation_letter_date?: string;
  exit_interview_summary?: string;
};

export type TransferInput = {
  employee: string;
  transfer_date: string;
  company: string;
  new_company?: string;
  new_department?: string;
  new_designation?: string;
  reason?: string;
};

export type PromotionInput = {
  employee: string;
  promotion_date: string;
  company: string;
  new_designation?: string;
  new_grade?: string;
  reason?: string;
};

export type GrievanceInput = {
  subject: string;
  raised_by: string;
  /** Form-side label kept stable; mapped to doctype's `grievance_against_party`. */
  grievance_against_type: "Employee" | "Department" | "Company";
  grievance_against: string;
  grievance_type: string;
  /** Form-side `grievance_raised_date` → doctype's `date`. */
  grievance_raised_date?: string;
  cause_of_grievance?: string;
  description: string;
};

function compact<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

async function insert(doc: Record<string, unknown>): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

/** Find ANY existing Employee Onboarding for a given employee,
 *  regardless of status. Frappe HR's `validate_duplicate_employee_onboarding`
 *  refuses to save a second onboarding for the same job_applicant —
 *  including when the earlier one is already Completed. When
 *  job_applicant is null (HR-created onboarding), the check collapses
 *  to "any two nulls collide", which then blocks the Pending→In Process
 *  transition on the second row with a cryptic 417. Guarding at
 *  create-time is the only clean fix: we short-circuit into whichever
 *  row already exists rather than creating a doomed second draft.
 *
 *  Active rows (Pending / In Process) beat Completed ones so the
 *  redirect lands on the row the user is most likely to want to work
 *  on. Returns the row's name + status, or null. */
export async function findExistingOnboardingForEmployee(
  employee: string,
): Promise<{ name: string; status: string } | null> {
  type Row = { name: string; boarding_status: string };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee Onboarding",
      filters: JSON.stringify([["employee", "=", employee]]),
      fields: ["name", "boarding_status"],
      // "Pending"/"In Process" sort before "Completed" alphabetically,
      // which happens to be the priority we want anyway; tie-break on
      // most-recently-modified so the freshest active draft wins.
      order_by: "boarding_status asc, modified desc",
      limit_page_length: 1,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  const hit = rows[0];
  return hit ? { name: hit.name, status: hit.boarding_status } : null;
}

/** Same shape for Separation. Separation's phase column is `status`
 *  (not `boarding_status`) — matches the write-path mapping. Frappe HR's
 *  Employee Separation carries the same one-per-applicant validator, so
 *  we broaden the guard the same way as onboarding. */
export async function findExistingSeparationForEmployee(
  employee: string,
): Promise<{ name: string; status: string } | null> {
  type Row = { name: string; status: string };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee Separation",
      filters: JSON.stringify([["employee", "=", employee]]),
      fields: ["name", "status"],
      order_by: "status asc, modified desc",
      limit_page_length: 1,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  const hit = rows[0];
  return hit ? { name: hit.name, status: hit.status } : null;
}

export async function createOnboarding(input: OnboardingInput): Promise<string> {
  return insert({
    doctype: "Employee Onboarding",
    boarding_status: "Pending",
    ...compact(input),
  });
}

export async function createSeparation(input: SeparationInput): Promise<string> {
  // Map our shared form field `boarding_begins_on` to the doctype's real
  // `separation_begins_on` column. Separation's phase column is `status`,
  // not `boarding_status` — writing the wrong one silently no-ops.
  const { boarding_begins_on, ...rest } = input;
  return insert({
    doctype: "Employee Separation",
    status: "Pending",
    separation_begins_on: boarding_begins_on,
    ...compact(rest),
  });
}

/**
 * Transfer + Promotion both carry an `Employee Property History` child table
 * (one row per property changed). We unpack the form's flat `new_*` fields
 * into that shape so the user doesn't have to deal with child rows directly.
 */
function transferDetails(input: TransferInput) {
  const rows: Record<string, unknown>[] = [];
  if (input.new_company) {
    rows.push({
      doctype: "Employee Property History",
      property: "Company",
      new: input.new_company,
    });
  }
  if (input.new_department) {
    rows.push({
      doctype: "Employee Property History",
      property: "Department",
      new: input.new_department,
    });
  }
  if (input.new_designation) {
    rows.push({
      doctype: "Employee Property History",
      property: "Designation",
      new: input.new_designation,
    });
  }
  return rows;
}

export async function createTransfer(input: TransferInput): Promise<string> {
  // Frappe HR named this child table `employee_transfer_details`. Wrong key
  // silently fails with a generic Mandatory error.
  return insert({
    doctype: "Employee Transfer",
    employee: input.employee,
    transfer_date: input.transfer_date,
    company: input.company,
    new_company: input.new_company,
    employee_transfer_details: transferDetails(input),
    ...(input.reason ? { remarks: input.reason } : {}),
  });
}

/**
 * Typed transfer input — one row in `employee_transfer_details`. Used by
 * the /transfer/new/<type> flow where HR has already chosen which single
 * Employee field is changing.
 */
export type TypedTransferInput = {
  employee: string;
  transfer_date: string;
  /** Current Company on the Employee (top-level Transfer.company). */
  company: string;
  /** Employee fieldname that will change — e.g. `department`, `pay_grade`. */
  fieldname: string;
  /** Current value on the Employee for that field, snapshotted for audit. */
  current_value: string | null;
  /** Target value. */
  new_value: string;
  reason?: string;
  /** Populated only for the `company` transfer type. Written to
   *  Transfer.new_company so Frappe's on_submit knows about the entity move. */
  new_company?: string;
  /** Populated only for the `company` type when HR wants a fresh
   *  Employee ID for the target entity. */
  create_new_employee_id?: 0 | 1;
};

export async function createTypedTransfer(input: TypedTransferInput): Promise<string> {
  // Employee Profile History rows want {fieldname, current, new} — a plain
  // dict is enough; Frappe fills doctype/idx on insert of the parent.
  const detailRow: Record<string, unknown> = {
    fieldname: input.fieldname,
    new: input.new_value,
  };
  if (input.current_value !== null && input.current_value !== undefined) {
    detailRow.current = input.current_value;
  }
  return insert({
    doctype: "Employee Transfer",
    employee: input.employee,
    transfer_date: input.transfer_date,
    company: input.company,
    ...(input.new_company ? { new_company: input.new_company } : {}),
    ...(input.create_new_employee_id
      ? { create_new_employee_id: 1 }
      : {}),
    employee_transfer_details: [detailRow],
    // Note: `reason` is a real Small Text field on the DocType (added
    // alongside this); earlier writes used `remarks` which the DocType
    // doesn't have — Frappe silently dropped every note HR typed.
    ...(input.reason ? { reason: input.reason } : {}),
  });
}

export async function createPromotion(input: PromotionInput): Promise<string> {
  // Child rows use the SAME Employee Profile History shape as Transfer —
  // {fieldname, new} — so Frappe's on_submit walks them via
  // update_employee_work_history and setattr's the target field on the
  // Employee record. Earlier writes used {property: "Designation"} with
  // the wrong doctype key and Frappe silently dropped every row.
  const rows: Record<string, unknown>[] = [];
  if (input.new_designation) {
    rows.push({ fieldname: "designation", new: input.new_designation });
  }
  if (input.new_grade) {
    rows.push({ fieldname: "pay_grade", new: input.new_grade });
  }
  return insert({
    doctype: "Employee Promotion",
    employee: input.employee,
    promotion_date: input.promotion_date,
    company: input.company,
    // The child table on Employee Promotion is `employee_promotion_details`,
    // not `promotion_details` — the wrong key silently loses the change-set.
    employee_promotion_details: rows,
    // `reason` is a real Small Text field on the DocType (added alongside
    // this); the old write used `remarks` which the DocType doesn't have.
    ...(input.reason ? { reason: input.reason } : {}),
  });
}

async function ensureGrievanceType(name: string): Promise<void> {
  const count = await frappeCall<number>({
    method: "frappe.client.get_count",
    args: {
      doctype: "Grievance Type",
      filters: JSON.stringify([["name", "=", name]]),
    },
    as: "user",
  }).catch(() => 0);
  if (count > 0) return;
  await frappeCall({
    method: "frappe.client.insert",
    args: {
      doc: { doctype: "Grievance Type", name },
    },
    verb: "POST",
    as: "user",
  }).catch(() => undefined);
}

export async function createGrievance(input: GrievanceInput): Promise<string> {
  if (input.grievance_type) await ensureGrievanceType(input.grievance_type);
  return insert({
    doctype: "Employee Grievance",
    status: "Open",
    subject: input.subject,
    raised_by: input.raised_by,
    grievance_against_party: input.grievance_against_type,
    grievance_against: input.grievance_against,
    grievance_type: input.grievance_type,
    date: input.grievance_raised_date,
    cause_of_grievance: input.cause_of_grievance,
    description: input.description,
  });
}

// ----------------------------------------------------------- transitions

/** For onboarding & separation — flips the phase column via the
 *  guarded backend helper, so a "Completed" move is refused when any
 *  activity flagged `required_for_employee_creation` is still open.
 *  The helper also handles the Onboarding-vs-Separation column-name
 *  quirk (`boarding_status` vs `status`) server-side.
 *
 *  Falls back to plain `frappe.client.set_value` when the helper
 *  hasn't been deployed yet (the guard only lives on the backend post
 *  this change) so the button keeps working across the deploy gap. */
export async function setBoardingStatus(
  kind: "onboarding" | "separation",
  id: string,
  status: "Pending" | "In Process" | "Completed",
): Promise<void> {
  try {
    await frappeCall({
      method: "human_resources.api.lifecycle_activities.set_boarding_status",
      args: {
        parent: id,
        parenttype: KIND_META[kind].doctype,
        status,
      },
      verb: "POST",
      as: "user",
    });
    return;
  } catch (err) {
    // If the helper is deployed, its ValidationError becomes the
    // client-facing message ("Can't mark this Completed — ...").
    // Only fall back for the specific "method not found" 404 that a
    // pre-deploy backend produces.
    if (err instanceof FrappeRequestError && err.status === 404) {
      const fieldName = kind === "onboarding" ? "boarding_status" : "status";
      await frappeCall({
        method: "frappe.client.set_value",
        args: {
          doctype: KIND_META[kind].doctype,
          name: id,
          fieldname: { [fieldName]: status },
        },
        verb: "POST",
        as: "user",
      });
      return;
    }
    throw err;
  }
}

export async function setGrievanceStatus(
  id: string,
  status: "Open" | "Investigated" | "Resolved" | "Invalid",
): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    args: {
      doctype: "Employee Grievance",
      name: id,
      fieldname: { status },
    },
    verb: "POST",
    as: "user",
  });
}

/** Transfer + Promotion are submittable. Submit applies the changes on the
 *  transfer_date / promotion_date. */
export async function submitLifecycle(
  kind: "transfer" | "promotion",
  id: string,
): Promise<void> {
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: KIND_META[kind].doctype, name: id },
    as: "user",
  });
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

export async function cancelLifecycle(
  kind: "transfer" | "promotion",
  id: string,
): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.cancel",
    args: { doctype: KIND_META[kind].doctype, name: id },
    verb: "POST",
    as: "user",
  });
}

/** Hard-delete an onboarding or separation row. Used to clean up
 *  duplicates that slipped past the create-time guard, and to unblock
 *  the Frappe HR duplicate validator when an old Completed row is
 *  preventing transitions on a newer one. Callers should confirm with
 *  the user before invoking — Frappe's client.delete is unrecoverable. */
export async function deleteLifecycleRecord(
  kind: LifecycleKind,
  id: string,
): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    args: { doctype: KIND_META[kind].doctype, name: id },
    verb: "POST",
    as: "user",
  });
}

export const BOARDING_STATUSES = ["Pending", "In Process", "Completed"] as const;
export const GRIEVANCE_STATUSES = [
  "Open",
  "Investigated",
  "Resolved",
  "Invalid",
] as const;
export const GRIEVANCE_AGAINST_TYPES = [
  "Employee",
  "Department",
  "Company",
] as const;

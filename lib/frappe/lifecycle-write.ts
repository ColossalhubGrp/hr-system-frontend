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
    case "separation":
      return (d.boarding_status as string) ?? "Pending";
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

export async function createOnboarding(input: OnboardingInput): Promise<string> {
  return insert({
    doctype: "Employee Onboarding",
    boarding_status: "Pending",
    ...compact(input),
  });
}

export async function createSeparation(input: SeparationInput): Promise<string> {
  // Map our shared form field `boarding_begins_on` to the doctype's real
  // `separation_begins_on` column.
  const { boarding_begins_on, ...rest } = input;
  return insert({
    doctype: "Employee Separation",
    boarding_status: "Pending",
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

export async function createPromotion(input: PromotionInput): Promise<string> {
  const rows: Record<string, unknown>[] = [];
  if (input.new_designation) {
    rows.push({
      doctype: "Employee Property History",
      property: "Designation",
      new: input.new_designation,
    });
  }
  if (input.new_grade) {
    rows.push({
      doctype: "Employee Property History",
      property: "Grade",
      new: input.new_grade,
    });
  }
  return insert({
    doctype: "Employee Promotion",
    employee: input.employee,
    promotion_date: input.promotion_date,
    company: input.company,
    promotion_details: rows,
    ...(input.reason ? { remarks: input.reason } : {}),
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

/** For onboarding & separation — just flips the `boarding_status` Select. */
export async function setBoardingStatus(
  kind: "onboarding" | "separation",
  id: string,
  status: "Pending" | "In Process" | "Completed",
): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    args: {
      doctype: KIND_META[kind].doctype,
      name: id,
      fieldname: { boarding_status: status },
    },
    verb: "POST",
    as: "user",
  });
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  createDeduction,
  createGarnishment,
  createReimbursement,
  createTaxExemption,
  createTaxNotice,
  deactivateDeduction,
  deactivateTaxExemption,
  saveCompanyPayrollSettings,
  setReimbursementStatus,
  updateGarnishmentStatus,
  updateTaxNoticeStatus,
  upsertGLMapping,
} from "@/lib/payroll-engine/doctype-helpers";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;

async function requirePayrollAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isHrAdmin) {
    return "Payroll Admin or HR Admin required.";
  }
  return null;
}

function fieldErrorsFrom(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

// ── Garnishments ───────────────────────────────────────────────────

const garnishmentSchema = z.object({
  employee: z.string().trim().min(1, "Required."),
  type: z.string().trim().min(1, "Required."),
  case_number: z.string().trim().min(1, "Required."),
  agency: z.string().trim().optional(),
  calc_type: z.enum(["FIXED", "PERCENT"]).default("FIXED"),
  amount: z.coerce.number().nonnegative(),
  max_percent: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().optional(),
});

export async function createGarnishmentAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = garnishmentSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);
  try {
    await createGarnishment({
      ...parsed.data,
      agency: parsed.data.agency || "",
      status: "ACTIVE",
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/garnishments");
  return {};
}

export async function releaseGarnishmentAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await updateGarnishmentStatus(name, "RELEASED");
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/garnishments");
  return {};
}

// ── Tax Notices ────────────────────────────────────────────────────

const taxNoticeSchema = z.object({
  agency: z.string().trim().min(1, "Required."),
  jurisdiction: z.string().trim().optional(),
  form: z.string().trim().min(1, "Required."),
  period: z.string().trim().optional(),
  due_date: z.string().trim().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().optional(),
});

export async function createTaxNoticeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = taxNoticeSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);
  try {
    await createTaxNotice({
      ...parsed.data,
      jurisdiction: parsed.data.jurisdiction || null,
      period: parsed.data.period || null,
      due_date: parsed.data.due_date || null,
      amount: parsed.data.amount ?? 0,
      status: "EXPECTED",
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/tax-notices");
  return {};
}

export async function markTaxNoticeStatusAction(
  name: string,
  status: "ACTION_NEEDED" | "FILED" | "PAID" | "DISMISSED",
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await updateTaxNoticeStatus(name, status);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/tax-notices");
  return {};
}

// ── Tax Exemptions ─────────────────────────────────────────────────

const taxExemptionSchema = z.object({
  scope: z.enum(["COMPANY", "EMPLOYEE"]).default("COMPANY"),
  employee: z.string().trim().optional(),
  tax_type: z.string().trim().min(1, "Required."),
  reason: z.string().trim().min(1, "Required."),
  valid_from: z.string().trim().optional(),
  valid_until: z.string().trim().optional(),
});

export async function createTaxExemptionAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = taxExemptionSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);
  if (parsed.data.scope === "EMPLOYEE" && !parsed.data.employee) {
    return {
      error: "Employee is required when scope is EMPLOYEE.",
      fieldErrors: { employee: "Required for per-employee exemptions." },
    };
  }
  try {
    await createTaxExemption({
      scope: parsed.data.scope,
      employee: parsed.data.employee || null,
      tax_type: parsed.data.tax_type,
      reason: parsed.data.reason,
      active: 1,
      valid_from: parsed.data.valid_from || null,
      valid_until: parsed.data.valid_until || null,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/tax-exemptions");
  return {};
}

export async function deactivateExemptionAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await deactivateTaxExemption(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/tax-exemptions");
  return {};
}

// ── Company Payroll Settings ───────────────────────────────────────

const settingsSchema = z.object({
  legal_name: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  principal_officer: z.string().trim().optional(),
  pay_frequency: z.enum([
    "Weekly",
    "Bi-weekly",
    "Semi-monthly",
    "Monthly",
    "Daily",
  ]),
  pay_day: z.string().trim().optional(),
  approval_lead_days: z.coerce.number().int().min(0).default(4),
  auto_run: z.coerce.boolean().optional(),
  email_payslips_on_approve: z.coerce.boolean().optional(),
  bank_name: z.string().trim().optional(),
  bank_last4: z.string().trim().optional(),
  default_work_location: z.string().trim().optional(),
});

export async function saveSettingsAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = settingsSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);
  try {
    await saveCompanyPayrollSettings({
      ...parsed.data,
      auto_run: parsed.data.auto_run ? 1 : 0,
      email_payslips_on_approve: parsed.data.email_payslips_on_approve ? 1 : 0,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/setup/settings");
  return {};
}

// ── Reimbursements ─────────────────────────────────────────────────

const reimbursementSchema = z.object({
  employee: z.string().trim().min(1, "Required."),
  date: z.string().trim().min(1, "Required."),
  category: z.string().trim().min(1, "Required."),
  amount: z.coerce.number().positive(),
  memo: z.string().trim().optional(),
});

export async function createReimbursementAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = reimbursementSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);
  try {
    await createReimbursement({
      ...parsed.data,
      status: "PENDING",
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/reimbursements");
  return {};
}

export async function setReimbursementStatusAction(
  name: string,
  status: "APPROVED" | "PAID" | "REJECTED",
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await setReimbursementStatus(name, status);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/reimbursements");
  return {};
}

// ── Recurring Deductions ───────────────────────────────────────────

const deductionSchema = z.object({
  employee: z.string().trim().min(1, "Required."),
  type: z.string().trim().min(1, "Required."),
  calc_type: z.enum(["FIXED", "PERCENT"]).default("FIXED"),
  amount: z.coerce.number().positive(),
  pre_tax: z.coerce.boolean().optional(),
  effective_from: z.string().trim().optional(),
  effective_until: z.string().trim().optional(),
});

export async function createDeductionAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = deductionSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);
  try {
    await createDeduction({
      ...parsed.data,
      pre_tax: parsed.data.pre_tax ? 1 : 0,
      active: 1,
      effective_from: parsed.data.effective_from || null,
      effective_until: parsed.data.effective_until || null,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/deductions");
  return {};
}

export async function deactivateDeductionAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await deactivateDeduction(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/deductions");
  return {};
}

// ── GL Mapping ─────────────────────────────────────────────────────

const glSchema = z.object({
  category: z.string().trim().min(1, "Required."),
  account: z.string().trim().min(1, "Required."),
  notes: z.string().trim().optional(),
});

export async function upsertGLMappingAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = glSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);
  try {
    await upsertGLMapping(parsed.data.category, parsed.data.account, parsed.data.notes);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/accounting");
  return {};
}

// ── Generic deletes / toggles for row actions ──────────────────────

async function deleteDoc(doctype: string, name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    args: { doctype, name },
    as: "user",
    verb: "POST",
  });
}

async function toggleField(
  doctype: string,
  name: string,
  field: string,
): Promise<void> {
  const cur = await frappeCall<{ message?: Record<string, unknown> } | Record<string, unknown>>({
    method: "frappe.client.get_value",
    args: { doctype, filters: { name }, fieldname: field },
    as: "user",
  });
  const payload = (cur && typeof cur === "object" && "message" in cur ? cur.message : cur) as Record<string, unknown>;
  const next = payload?.[field] ? 0 : 1;
  await frappeCall({
    method: "frappe.client.set_value",
    args: { doctype, name, fieldname: { [field]: next } },
    as: "user",
    verb: "POST",
  });
}

export async function deleteReimbursementAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await deleteDoc("Payroll Reimbursement", name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/reimbursements");
  return {};
}

export async function approveReimbursementAction(name: string): Promise<FormState> {
  return setReimbursementStatusAction(name, "APPROVED");
}

export async function toggleDeductionAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await toggleField("Recurring Payroll Deduction", name, "active");
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/deductions");
  return {};
}

export async function deleteDeductionAction_(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await deleteDoc("Recurring Payroll Deduction", name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/deductions");
  return {};
}

export async function deleteGarnishmentAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await deleteDoc("Garnishment", name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/garnishments");
  return {};
}

export async function markFiledNoticeAction(name: string): Promise<FormState> {
  return markTaxNoticeStatusAction(name, "FILED");
}

export async function markPaidNoticeAction(name: string): Promise<FormState> {
  return markTaxNoticeStatusAction(name, "PAID");
}

export async function deleteNoticeAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await deleteDoc("Tax Notice", name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/tax-notices");
  return {};
}

export async function toggleExemptionAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await toggleField("Tax Exemption", name, "active");
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/tax-exemptions");
  return {};
}

export async function deleteExemptionAction(name: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await deleteDoc("Tax Exemption", name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/tax-exemptions");
  return {};
}

// ── Run lifecycle (wizard) ────────────────────────────────────────

/**
 * Fill the Payroll Entry's `employees` child table from the active
 * employees on the company, then create the draft Salary Slips.
 * Idempotent — re-running just refreshes the slips that aren't
 * submitted yet.
 *
 * Maps onto Frappe's two Payroll Entry methods:
 *   `fill_employee_details` — populates the Payroll Employee Detail rows
 *   `create_salary_slips`   — creates one draft Salary Slip per row
 */
export async function setupRunAction(payrollEntry: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  // Single Python helper does set-status → fill_employee_details →
  // create_salary_slips, each re-fetching the doc inside one request.
  // That avoids the TimestampMismatchError we'd see chaining bare
  // run_doc_method calls (each mutator bumps `modified`, the next
  // call's optimistic-concurrency check fails).
  try {
    await frappeCall({
      method: "tenant_manager.payroll_engine.api.run.setup",
      args: { payroll_entry: payrollEntry },
      as: "user",
      verb: "POST",
    });
  } catch (err) {
    console.error("[payroll] setupRunAction failed:", err);
    return toFormState(err);
  }
  revalidatePath(`/payroll/${encodeURIComponent(payrollEntry)}`);
  revalidatePath(`/payroll/${encodeURIComponent(payrollEntry)}/run`);
  return {};
}

/**
 * Apply per-stub overrides (additional pay, reimbursements, etc.) to
 * the draft Salary Slips. Each entry in `stubs` is `(name, fields)`
 * — only the fields that differ from server state need to be sent.
 */
export async function saveStubsAction(
  stubs: Array<{
    name: string;
    additional_pay?: number;
    reimbursements?: number;
    hours_worked?: number;
    overtime_hours?: number;
    included?: boolean;
  }>,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  for (const s of stubs) {
    const { name, included, ...rest } = s;
    if (Object.keys(rest).length === 0 && included === undefined) continue;
    try {
      // ERPNext Salary Slip carries different field names than our
      // wizard. We only pass through what maps cleanly; the rest
      // (overtime split, doubleOt, etc.) gets stored as memo.
      const payload: Record<string, unknown> = {};
      if (rest.additional_pay !== undefined) payload.amount_for_other_currency = rest.additional_pay; // closest stock field
      // For v1 we only persist the bare minimum — full mapping comes
      // when we add Custom Fields to Salary Slip for wizard inputs.
      await frappeCall({
        method: "frappe.client.set_value",
        args: { doctype: "Salary Slip", name, fieldname: payload },
        as: "user",
        verb: "POST",
      }).catch(() => {});
    } catch {
      // soft-fail per row; the wizard surfaces a banner if needed
    }
  }
  return {};
}

/**
 * Approve the run: submit the Payroll Entry, which submits all linked
 * Salary Slips. After this, the run is locked and can be marked Paid.
 */
export async function approveRunAction(payrollEntry: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  // Server-side helper submits slips + the Payroll Entry sequentially
  // on freshly-fetched docs. Same reason as setupRunAction — chaining
  // these two via the bare client API breaks on `modified` mismatch.
  try {
    await frappeCall({
      method: "tenant_manager.payroll_engine.api.run.approve",
      args: { payroll_entry: payrollEntry },
      as: "user",
      verb: "POST",
    });
  } catch (err) {
    console.error("[payroll] approveRunAction failed:", err);
    return toFormState(err);
  }
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollEntry)}`);
  revalidatePath(`/payroll/${encodeURIComponent(payrollEntry)}/run`);
  return {};
}

/**
 * Mark an approved run as Paid. ERPNext doesn't carry a `Paid` status
 * on Payroll Entry directly — we use the linked Bank Entry approach
 * (`make_bank_entry` doc-method) in the next iteration. For now we
 * set a status flag and revalidate.
 */
export async function markRunPaidAction(payrollEntry: string): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    await frappeCall({
      method: "tenant_manager.payroll_engine.api.run.mark_paid",
      args: { payroll_entry: payrollEntry },
      as: "user",
      verb: "POST",
    });
  } catch (err) {
    console.error("[payroll] markRunPaidAction failed:", err);
    return toFormState(err);
  }
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollEntry)}`);
  return {};
}

// ── Batch-email payslips for a Pay Run ──────────────────────────

/**
 * Triggers Frappe's email queue to send each submitted slip as a PDF
 * attachment to the employee's personal_email (fallback company_email).
 * Returns counts: {sent, skipped, failed, errors: [...]}.
 */
export async function emailPayslipsAction(
  payrollEntry: string,
): Promise<FormState & { result?: { sent: number; skipped: number; failed: number } }> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  try {
    const res = await frappeCall<{
      sent: number;
      skipped: number;
      failed: number;
      errors: Array<{ slip?: string; reason?: string }>;
    }>({
      method: "tenant_manager.payroll_engine.mailers.email_payslips_for_run",
      args: { payroll_entry: payrollEntry },
      as: "user",
      verb: "POST",
    });
    revalidatePath(`/payroll/${encodeURIComponent(payrollEntry)}`);
    return { result: res };
  } catch (err) {
    return toFormState(err);
  }
}

// ── Request missing payroll details from an employee ─────────────

/**
 * Looks up an employee's email and returns the suggested To/Subject/Body
 * the dialog renders. The dialog then calls `sendMissingDetailsRequestAction`
 * with whatever the payroll admin edited.
 *
 * Falls back to a placeholder email if the Employee doc has no
 * personal_email / company_email — the admin can correct it in the
 * dialog before sending.
 */
export async function getMissingDetailsRequestDraftAction(
  employeeId: string,
  missing: string[],
): Promise<{ to: string; subject: string; body: string }> {
  const blocked = await requirePayrollAdmin();
  if (blocked) {
    return { to: "", subject: "", body: blocked };
  }
  let employeeName = employeeId;
  let to = "";
  try {
    // frappeCall already unwraps `.message` — get_value returns the
    // field dict inline. Be defensive (some Frappe versions wrap, some
    // don't).
    const res = await frappeCall<
      | { employee_name?: string; personal_email?: string; company_email?: string }
      | { message?: { employee_name?: string; personal_email?: string; company_email?: string } }
    >({
      method: "frappe.client.get_value",
      args: {
        doctype: "Employee",
        filters: { name: employeeId },
        fieldname: ["employee_name", "personal_email", "company_email"],
      },
      as: "user",
    });
    const e = (
      res && typeof res === "object" && "message" in res
        ? (res as { message?: Record<string, string> }).message ?? {}
        : (res ?? {})
    ) as { employee_name?: string; personal_email?: string; company_email?: string };
    employeeName = e.employee_name || employeeId;
    to = e.personal_email || e.company_email || "";
  } catch (err) {
    console.error(`[payroll] missing-details draft lookup for ${employeeId} failed:`, err);
  }

  const bullets = missing.map((m) => `  • ${m}`).join("\n");
  const subject = `Action needed: complete your payroll details`;
  const body =
    `Hi ${employeeName.split(" ")[0] ?? "there"},\n\n` +
    `Payroll can't run for you in the upcoming pay run because we're missing the following details on your profile:\n\n` +
    `${bullets}\n\n` +
    `Please sign in to Colossal HR, open your profile (Employee → your name → Salary tab), and fill these in. ` +
    `If you need help, reply to this email and the HR team will get back to you.\n\n` +
    `Thanks.`;
  return { to, subject, body };
}

export async function sendMissingDetailsRequestAction(payload: {
  employeeId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  if (!payload.to.trim()) return { error: "Recipient email is required." };
  if (!payload.subject.trim()) return { error: "Subject is required." };

  try {
    await frappeCall({
      method: "frappe.core.doctype.communication.email.make",
      args: {
        recipients: payload.to.trim(),
        subject: payload.subject.trim(),
        content: payload.body,
        doctype: "Employee",
        name: payload.employeeId,
        send_email: 1,
        // 0 = no attachment; communication_type=Email by default.
      },
      as: "user",
      verb: "POST",
    });
  } catch (err) {
    return toFormState(err);
  }
  return {};
}

// ── New Pay Run (creates Frappe Payroll Entry, redirects to detail) ─

const newRunSchema = z.object({
  start_date: z.string().trim().min(1, "Required."),
  end_date: z.string().trim().min(1, "Required."),
  posting_date: z.string().trim().min(1, "Required."),
  payroll_frequency: z.enum([
    "Weekly",
    "Fortnightly",
    "Bimonthly",
    "Monthly",
    "Daily",
  ]),
  // Currency the slips are paid in. Defaults to company.default_currency
  // when the form is rendered.
  currency: z.string().trim().min(1, "Required."),
  // FK to Account (root_type=Liability). Required by ERPNext to book the
  // journal entry that moves wages from expense → payable.
  payroll_payable_account: z.string().trim().min(1, "Required."),
  // Multi-currency: company currency → slip currency. 1 for single-
  // currency tenants. Stored as Float on Payroll Entry.
  exchange_rate: z.coerce.number().positive("Must be > 0"),
});

export async function createPayRunAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requirePayrollAdmin();
  if (blocked) return { error: blocked };
  const parsed = newRunSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrorsFrom(parsed);

  const company = await myCompany();
  if (!company) return { error: "No company in session." };

  let res: { name: string };
  try {
    res = await frappeCall<{ name: string }>({
      method: "frappe.client.insert",
      args: {
        doc: {
          doctype: "Payroll Entry",
          company,
          ...parsed.data,
          status: "Draft",
        },
      },
      as: "user",
      verb: "POST",
    });
  } catch (err) {
    return toFormState(err);
  }

  // Immediately populate the run with employees + draft pay stubs so the
  // detail page lands with data, not an empty state. Failures here are
  // logged but NOT thrown — the user can still hit Recalculate from the
  // wizard. We intentionally don't surface the error on the New Pay Run
  // form because the Payroll Entry IS created at this point and the
  // redirect is the right next step.
  try {
    await setupRunAction(res.name);
  } catch (err) {
    console.error("[payroll] auto-setup after createPayRunAction failed:", err);
  }

  revalidatePath("/payroll");
  redirect(`/payroll/${encodeURIComponent(res.name)}`);
}

import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

/**
 * Typed Frappe-side wrappers for the new payroll DocTypes (Garnishment,
 * Tax Notice, Tax Exemption, Company Payroll Settings, Payroll GL
 * Mapping). Every list call is auto-scoped to the current user's
 * Company.
 *
 * Insert / update / soft-delete use Frappe's generic frappe.client
 * methods; field-level validation lives on the Frappe side. The Server
 * Actions in each page call these helpers and translate errors to
 * StdFormState.
 */

// ── Generic CRUD primitives ─────────────────────────────────────────

async function listDocs<T extends Record<string, unknown>>(
  doctype: string,
  opts: {
    fields: string[];
    filters?: Record<string, unknown>;
    orderBy?: string;
    limit?: number;
  },
): Promise<T[]> {
  const company = await myCompany();
  const filters: Record<string, unknown> = { ...(opts.filters ?? {}) };
  if (company && !("company" in filters)) filters.company = company;
  try {
    const res = await frappeCall<{ message?: T[] } | T[]>({
      method: "frappe.client.get_list",
      args: {
        doctype,
        filters,
        fields: opts.fields,
        order_by: opts.orderBy ?? "modified desc",
        limit_page_length: opts.limit ?? 200,
      },
      as: "user",
    });
    return Array.isArray(res) ? res : (res?.message ?? []);
  } catch (err) {
    // Surface the error so we don't silently return empty lists when
    // Frappe rejects the query (e.g. a removed field or perm denial).
    console.error(`[payroll listDocs] ${doctype} failed:`, err);
    return [];
  }
}

async function getDoc<T>(doctype: string, name: string): Promise<T | null> {
  try {
    const res = await frappeCall<T>({
      method: "frappe.client.get",
      args: { doctype, name },
      as: "user",
    });
    return res as T;
  } catch {
    return null;
  }
}

async function insertDoc<T extends Record<string, unknown>>(
  doctype: string,
  doc: T,
): Promise<{ name: string }> {
  const company = await myCompany();
  const payload: Record<string, unknown> = {
    doctype,
    ...doc,
  };
  if (company && !("company" in payload)) payload.company = company;
  const res = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc: payload },
    as: "user",
    verb: "POST",
  });
  return res;
}

async function updateDoc(
  doctype: string,
  name: string,
  changes: Record<string, unknown>,
): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    args: { doctype, name, fieldname: changes },
    as: "user",
    verb: "POST",
  });
}

// ── Company-level defaults used by the New Pay Run form ───────────

export type CompanyPayrollDefaults = {
  defaultCurrency: string;
  /** Pre-selected option for the Payable Account select. */
  defaultPayrollPayableAccount: string | null;
  /** Every non-group Liability account on the company — choices for the select. */
  payableAccounts: { name: string; account_name: string }[];
};

const PAYABLE_HINTS = [
  "payroll payable",
  "salary payable",
  "wages payable",
  "employee benefits obligation",
  "salaries payable",
];

/**
 * Reads the company's default currency + payroll-payable account. If
 * the company hasn't set `default_payroll_payable_account`, we guess
 * by matching common chart-of-accounts names (Payroll Payable / Salary
 * Payable etc.) so the user has a sensible pre-selection.
 */
export async function getCompanyPayrollDefaults(): Promise<CompanyPayrollDefaults | null> {
  const company = await myCompany();
  if (!company) return null;

  // Only fields we know exist on vanilla Company. We deliberately do
  // NOT request `default_payroll_payable_account` — that field is
  // HRMS-shipped and missing on benches without the HRMS Company
  // custom field, where its absence throws "Field not permitted in
  // query" and would kill the whole defaults lookup.
  const defaultCurrency = await safeCompanyCurrency(company);
  const accounts = await safeListLiabilityAccounts(company);

  // Pick the closest-named match for the payable preselect.
  let preselected: string | null = null;
  for (const hint of PAYABLE_HINTS) {
    const m = accounts.find((a) => a.account_name.toLowerCase().includes(hint));
    if (m) {
      preselected = m.name;
      break;
    }
  }

  return {
    defaultCurrency,
    defaultPayrollPayableAccount: preselected,
    payableAccounts: accounts,
  };
}

async function safeCompanyCurrency(company: string): Promise<string> {
  try {
    const res = await frappeCall<{ message?: Record<string, string> }>({
      method: "frappe.client.get_value",
      args: {
        doctype: "Company",
        filters: { name: company },
        fieldname: ["default_currency"],
      },
      as: "user",
    });
    return (res?.message?.default_currency as string) || "USD";
  } catch (err) {
    console.error("[payroll] safeCompanyCurrency failed:", err);
    return "USD";
  }
}

async function safeListLiabilityAccounts(
  company: string,
): Promise<{ name: string; account_name: string }[]> {
  try {
    const res = await frappeCall<{ message?: Array<Record<string, string>> } | Array<Record<string, string>>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Account",
        filters: { company, root_type: "Liability", is_group: 0 },
        fields: ["name", "account_name"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    // frappe.client.get_list returns the list inline, NOT wrapped in
    // {message:...} — handle both shapes. (frappeCall already unwraps
    // `.message`, but earlier list calls had inconsistent envelopes;
    // be defensive.)
    const rows = Array.isArray(res) ? res : (res?.message ?? []);
    console.log(`[payroll] safeListLiabilityAccounts(${company}) → ${rows.length} accounts`);
    return rows as Array<{ name: string; account_name: string }>;
  } catch (err) {
    console.error("[payroll] safeListLiabilityAccounts failed:", err);
    return [];
  }
}

// ── Per-employee payroll snapshot (Salary tab on /employee/[id]) ──

export type EmployeePayrollSnapshot = {
  payType: "SALARY" | "HOURLY" | "CONTRACTOR";
  /** Annual salary (SALARY), hourly rate (HOURLY), or flat-per-period (CONTRACTOR). */
  comp: number;
  state: string | null;
  workLocation: string | null;
  homeLocation: string | null;
  retirementPct: number;
  missingFields: string[];
};

/**
 * Reads the payroll_* Custom Fields off a single Employee row. Returns null
 * if Frappe rejects the request (typically a permission denial).
 *
 * Note that we never need a separate doctype for this — the data lives
 * on Employee itself (added by patch 12).
 */
export async function getEmployeePayrollSnapshot(
  employee: string,
  options?: { selfService?: boolean },
): Promise<EmployeePayrollSnapshot | null> {
  // The sensitive fields (comp / bank / SSN / withholding) live at
  // permlevel 2 (patch 18). For self-service, the employee viewing
  // their OWN record doesn't have permlevel 2 — we hit a dedicated
  // endpoint that checks session.user against Employee.user_id and
  // returns the data bypassing the permlevel guard.
  try {
    const r = options?.selfService
      ? await fetchSelfSnapshot(employee)
      : await fetchAdminSnapshot(employee);
    if (!r || !r.name) return null;
    const payType = ((r.payroll_pay_type as string) || "SALARY") as EmployeePayrollSnapshot["payType"];
    const comp =
      payType === "HOURLY"
        ? Number(r.payroll_hourly_rate ?? 0)
        : payType === "CONTRACTOR"
          ? Number(r.payroll_flat_pay ?? 0)
          : Number(r.payroll_annual_salary ?? 0);
    const missing: string[] = [];
    if (!r.payroll_bank_account_last4) missing.push("Bank account");
    if (!r.payroll_ssn_last4) missing.push("Tax ID / SSN");
    if (!r.payroll_home_location) missing.push("Home location");
    if (!r.payroll_federal_withholding) missing.push("Federal withholding");
    if (!r.payroll_state_withholding) missing.push("State withholding");
    return {
      payType,
      comp,
      state: (r.payroll_state as string) || null,
      workLocation: (r.payroll_work_location as string) || null,
      homeLocation: (r.payroll_home_location as string) || null,
      retirementPct: Number(r.payroll_retirement_pct ?? 0),
      missingFields: missing,
    };
  } catch (err) {
    console.error(`[payroll] getEmployeePayrollSnapshot(${employee}) failed:`, err);
    return null;
  }
}

async function fetchAdminSnapshot(employee: string): Promise<Record<string, unknown> | null> {
  const res = await frappeCall<Record<string, unknown> | { message?: Record<string, unknown> }>({
    method: "frappe.client.get",
    args: { doctype: "Employee", name: employee },
    as: "user",
  });
  if (!res) return null;
  return ((res as { message?: Record<string, unknown> }).message ?? res) as Record<string, unknown>;
}

async function fetchSelfSnapshot(employee: string): Promise<Record<string, unknown> | null> {
  const res = await frappeCall<Record<string, unknown> | { message?: Record<string, unknown> }>({
    method: "tenant_manager.payroll_engine.api.self_service.my_payroll_snapshot",
    args: { employee },
    as: "user",
  });
  if (!res) return null;
  const r = ((res as { message?: Record<string, unknown> }).message ?? res) as Record<string, unknown>;
  // self_service returns `employee_name`/`department`/`job_title` plus
  // the sensitive fields, but NOT `name`. Mark `name` so the caller's
  // `if (!r.name)` truthy check passes.
  return { name: employee, ...r };
}

// ── Employee-name lookup (shared by every list that has an `employee` link) ──

/**
 * Map of HR-EMP-00xxx → "Joseph Musara" for the current company.
 *
 * We fetch it once per request and pass it to the page-level mappers
 * that render employee-linked rows (reimbursements, deductions, etc.),
 * so the UI never shows raw codes.
 */
export async function getEmployeeNameMap(): Promise<Record<string, string>> {
  const rows = await listDocs<{ name: string; employee_name: string }>(
    "Employee",
    {
      fields: ["name", "employee_name"],
      filters: { status: "Active" },
      orderBy: "employee_name asc",
      limit: 500,
    },
  );
  const out: Record<string, string> = {};
  for (const r of rows) out[r.name] = r.employee_name || r.name;
  return out;
}

// ── Garnishment ────────────────────────────────────────────────────

export type GarnishmentRow = {
  name: string;
  employee: string;
  employee_name?: string;
  type: string;
  case_number: string;
  agency: string | null;
  calc_type: "FIXED" | "PERCENT";
  amount: number;
  max_percent: number;
  status: "ACTIVE" | "PAUSED" | "RELEASED" | "FULFILLED";
  notes: string | null;
};

export async function listGarnishments(): Promise<GarnishmentRow[]> {
  return listDocs<GarnishmentRow>("Garnishment", {
    fields: [
      "name",
      "employee",
      "type",
      "case_number",
      "agency",
      "calc_type",
      "amount",
      "max_percent",
      "status",
    ],
  });
}

export async function createGarnishment(g: Omit<GarnishmentRow, "name" | "employee_name" | "notes"> & { notes?: string }): Promise<string> {
  const res = await insertDoc("Garnishment", g);
  return res.name;
}

export async function updateGarnishmentStatus(name: string, status: GarnishmentRow["status"]) {
  return updateDoc("Garnishment", name, { status });
}

// ── Tax Notice ─────────────────────────────────────────────────────

export type TaxNoticeRow = {
  name: string;
  agency: string;
  jurisdiction: string | null;
  form: string;
  period: string | null;
  due_date: string | null;
  amount: number | null;
  status: "EXPECTED" | "ACTION_NEEDED" | "FILED" | "PAID" | "DISMISSED";
  notes: string | null;
};

export async function listTaxNotices(): Promise<TaxNoticeRow[]> {
  return listDocs<TaxNoticeRow>("Tax Notice", {
    fields: [
      "name",
      "agency",
      "jurisdiction",
      "form",
      "period",
      "due_date",
      "amount",
      "status",
    ],
    orderBy: "due_date asc",
  });
}

export async function createTaxNotice(t: Omit<TaxNoticeRow, "name" | "notes"> & { notes?: string }): Promise<string> {
  const res = await insertDoc("Tax Notice", t);
  return res.name;
}

export async function updateTaxNoticeStatus(name: string, status: TaxNoticeRow["status"]) {
  return updateDoc("Tax Notice", name, { status });
}

// ── Tax Exemption ──────────────────────────────────────────────────

export type TaxExemptionRow = {
  name: string;
  scope: "COMPANY" | "EMPLOYEE";
  employee: string | null;
  tax_type: string;
  reason: string;
  active: 0 | 1 | boolean;
  valid_from: string | null;
  valid_until: string | null;
};

export async function listTaxExemptions(): Promise<TaxExemptionRow[]> {
  return listDocs<TaxExemptionRow>("Tax Exemption", {
    fields: [
      "name",
      "scope",
      "employee",
      "tax_type",
      "reason",
      "active",
      "valid_from",
      "valid_until",
    ],
  });
}

export async function createTaxExemption(t: Omit<TaxExemptionRow, "name">): Promise<string> {
  const res = await insertDoc("Tax Exemption", t);
  return res.name;
}

export async function deactivateTaxExemption(name: string): Promise<void> {
  return updateDoc("Tax Exemption", name, { active: 0 });
}

// ── Company Payroll Settings (per-company singleton) ──────────────

export type CompanyPayrollSettings = {
  company: string;
  legal_name: string | null;
  tax_id: string | null;
  principal_officer: string | null;
  pay_frequency:
    | "Weekly"
    | "Bi-weekly"
    | "Semi-monthly"
    | "Monthly"
    | "Daily";
  pay_day: string | null;
  approval_lead_days: number;
  auto_run: 0 | 1 | boolean;
  email_payslips_on_approve: 0 | 1 | boolean;
  bank_name: string | null;
  bank_last4: string | null;
  default_work_location: string | null;
};

/** Returns the singleton row for the current company; creates it on first read. */
export async function getCompanyPayrollSettings(): Promise<CompanyPayrollSettings | null> {
  const company = await myCompany();
  if (!company) return null;
  // Try fetching the existing row by name (we autoname by company)
  let doc = await getDoc<CompanyPayrollSettings>("Company Payroll Settings", company);
  if (doc) return doc;
  // First-time: insert a blank row so the page form has something to bind to
  try {
    await insertDoc<Partial<CompanyPayrollSettings>>("Company Payroll Settings", {
      company,
      pay_frequency: "Monthly",
      auto_run: 1,
      approval_lead_days: 4,
    });
    doc = await getDoc<CompanyPayrollSettings>("Company Payroll Settings", company);
    return doc;
  } catch {
    return null;
  }
}

export async function saveCompanyPayrollSettings(
  changes: Partial<CompanyPayrollSettings>,
): Promise<void> {
  const company = await myCompany();
  if (!company) throw new Error("No company in session.");
  await updateDoc("Company Payroll Settings", company, changes);
}

// ── Reimbursement ──────────────────────────────────────────────────

export type ReimbursementRow = {
  name: string;
  employee: string;
  date: string;
  category: string;
  amount: number;
  memo: string | null;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
};

export async function listReimbursements(): Promise<ReimbursementRow[]> {
  return listDocs<ReimbursementRow>("Payroll Reimbursement", {
    fields: ["name", "employee", "date", "category", "amount", "memo", "status"],
    orderBy: "date desc",
  });
}

export async function createReimbursement(
  r: Omit<ReimbursementRow, "name" | "memo"> & { memo?: string },
): Promise<string> {
  const res = await insertDoc("Payroll Reimbursement", r);
  return res.name;
}

export async function setReimbursementStatus(
  name: string,
  status: ReimbursementRow["status"],
): Promise<void> {
  return updateDoc("Payroll Reimbursement", name, { status });
}

// ── Recurring Payroll Deduction ────────────────────────────────────

export type DeductionRow = {
  name: string;
  employee: string;
  type: string;
  calc_type: "FIXED" | "PERCENT";
  amount: number;
  pre_tax: 0 | 1 | boolean;
  active: 0 | 1 | boolean;
  effective_from: string | null;
  effective_until: string | null;
  notes: string | null;
};

export async function listDeductions(): Promise<DeductionRow[]> {
  return listDocs<DeductionRow>("Recurring Payroll Deduction", {
    fields: [
      "name",
      "employee",
      "type",
      "calc_type",
      "amount",
      "pre_tax",
      "active",
      "effective_from",
      "effective_until",
    ],
    orderBy: "employee asc, type asc",
  });
}

export async function createDeduction(
  d: Omit<DeductionRow, "name" | "notes"> & { notes?: string },
): Promise<string> {
  const res = await insertDoc("Recurring Payroll Deduction", d);
  return res.name;
}

export async function deactivateDeduction(name: string): Promise<void> {
  return updateDoc("Recurring Payroll Deduction", name, { active: 0 });
}

// ── Payroll GL Mapping ─────────────────────────────────────────────

export type GLMappingRow = {
  name: string;
  category: string;
  account: string;
  notes: string | null;
};

export async function listGLMappings(): Promise<GLMappingRow[]> {
  return listDocs<GLMappingRow>("Payroll GL Mapping", {
    fields: ["name", "category", "account", "notes"],
    orderBy: "category asc",
  });
}

export async function upsertGLMapping(
  category: string,
  account: string,
  notes?: string,
): Promise<string> {
  const company = await myCompany();
  if (!company) throw new Error("No company in session.");
  const exists = await listGLMappings();
  const match = exists.find((m) => m.category === category);
  if (match) {
    await updateDoc("Payroll GL Mapping", match.name, { account, notes: notes ?? "" });
    return match.name;
  }
  const res = await insertDoc("Payroll GL Mapping", {
    category,
    account,
    notes: notes ?? "",
  });
  return res.name;
}

// ── People (Employee roster with payroll flags) ───────────────────

export type PayrollEmployee = {
  name: string;
  employeeName: string;
  designation: string | null;
  department: string | null;
  status: string;
  payType: "SALARY" | "HOURLY" | "CONTRACTOR";
  /** Annual salary (SALARY), hourly rate (HOURLY), or flat-per-period (CONTRACTOR). */
  annualSalary: number;
  state: string | null;
  workLocation: string | null;
  homeLocation: string | null;
  retirementPct: number;
  /** Currency this employee is paid in (independent of the company's books). */
  payCurrency: string | null;
  /** Fields the wizard considers "critical" (missing → can't be paid). */
  missingFields: string[];
};

export async function listPayrollEmployees(): Promise<PayrollEmployee[]> {
  // NOTE: this bench renamed Employee.designation → job_title (Link to
  // the Job Title doctype). If you port this to a vanilla ERPNext site
  // either swap "job_title" back to "designation" or wire up both with
  // a runtime feature detect.
  const rows = await listDocs<Record<string, unknown>>("Employee", {
    fields: [
      "name",
      "employee_name",
      "job_title",
      "department",
      "status",
      "payroll_pay_type",
      "payroll_annual_salary",
      "payroll_hourly_rate",
      "payroll_flat_pay",
      "payroll_state",
      "payroll_work_location",
      "payroll_home_location",
      "payroll_retirement_pct",
      "payroll_bank_account_last4",
      "payroll_ssn_last4",
      "payroll_federal_withholding",
      "payroll_state_withholding",
      "payroll_currency",
    ],
    filters: { status: "Active" },
    orderBy: "employee_name asc",
  });
  return rows.map((r) => {
    const payType =
      ((r.payroll_pay_type as string) || "SALARY") as PayrollEmployee["payType"];
    const comp =
      payType === "HOURLY"
        ? Number(r.payroll_hourly_rate ?? 0)
        : payType === "CONTRACTOR"
          ? Number(r.payroll_flat_pay ?? 0)
          : Number(r.payroll_annual_salary ?? 0);
    // Critical info — keep these labels human-readable; the People
    // page just shows the count, the wizard's missing-details step
    // shows the full list.
    const missing: string[] = [];
    if (!r.payroll_bank_account_last4) missing.push("Bank account");
    if (!r.payroll_ssn_last4) missing.push("Tax ID / SSN");
    if (!r.payroll_home_location) missing.push("Home location");
    if (!r.payroll_federal_withholding) missing.push("Federal withholding");
    if (!r.payroll_state_withholding) missing.push("State withholding");
    return {
      name: String(r.name ?? ""),
      employeeName: String(r.employee_name ?? r.name ?? ""),
      designation: (r.job_title as string) || null,
      department: (r.department as string) || null,
      status: String(r.status ?? "Active"),
      payType,
      annualSalary: comp,
      state: (r.payroll_state as string) || null,
      workLocation: (r.payroll_work_location as string) || null,
      homeLocation: (r.payroll_home_location as string) || null,
      retirementPct: Number(r.payroll_retirement_pct ?? 0),
      payCurrency: (r.payroll_currency as string) || null,
      missingFields: missing,
    };
  });
}

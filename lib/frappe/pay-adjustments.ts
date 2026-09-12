import "server-only";
import { frappeCall, FrappeRequestError } from "./client";

// ============================================================================
// Shared submit / cancel through the admin whitelist
// ============================================================================

export type AdjustmentDoctype =
  | "Additional Salary"
  | "Retention Bonus"
  | "Employee Incentive";

export async function submitAdjustment(
  doctype: AdjustmentDoctype,
  name: string,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_submit_generic",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

export async function cancelAdjustment(
  doctype: AdjustmentDoctype,
  name: string,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_cancel_generic",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

// ============================================================================
// Salary Component picker (shared by all three forms)
// ============================================================================

export type SalaryComponentRow = {
  name: string;
  type: string | null;
  abbr: string | null;
};

export async function listSalaryComponents(opts?: {
  type?: "Earning" | "Deduction";
}): Promise<SalaryComponentRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.type) filters.push(["type", "=", opts.type]);
  try {
    type R = { name: string; type: string | null; salary_component_abbr: string | null };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Component",
        fields: ["name", "type", "salary_component_abbr"],
        filters: JSON.stringify(filters),
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      type: r.type,
      abbr: r.salary_component_abbr,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// Additional Salary — the primitive
// ============================================================================

export type AdditionalSalaryRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  salaryComponent: string;
  amount: number;
  currency: string | null;
  payrollDate: string | null;
  fromDate: string | null;
  toDate: string | null;
  isRecurring: boolean;
  overwriteSalaryStructureAmount: boolean;
  deductFullTaxOnSelectedPayrollDate: boolean;
  refDoctype: string | null;
  refDocname: string | null;
  status: string;
  docstatus: 0 | 1 | 2;
};

export type AdditionalSalaryFull = AdditionalSalaryRow & {
  company: string | null;
  department: string | null;
};

export async function listAdditionalSalaries(opts?: {
  employee?: string;
  component?: string;
  status?: string;
}): Promise<AdditionalSalaryRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  if (opts?.component) filters.push(["salary_component", "=", opts.component]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      salary_component: string;
      amount: number | null;
      currency: string | null;
      payroll_date: string | null;
      from_date: string | null;
      to_date: string | null;
      is_recurring: 0 | 1 | null;
      overwrite_salary_structure_amount: 0 | 1 | null;
      deduct_full_tax_on_selected_payroll_date: 0 | 1 | null;
      ref_doctype: string | null;
      ref_docname: string | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Additional Salary",
        fields: [
          "name",
          "employee",
          "employee_name",
          "salary_component",
          "amount",
          "currency",
          "payroll_date",
          "from_date",
          "to_date",
          "is_recurring",
          "overwrite_salary_structure_amount",
          "deduct_full_tax_on_selected_payroll_date",
          "ref_doctype",
          "ref_docname",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "payroll_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      salaryComponent: r.salary_component,
      amount: Number(r.amount ?? 0),
      currency: r.currency,
      payrollDate: r.payroll_date,
      fromDate: r.from_date,
      toDate: r.to_date,
      isRecurring: Boolean(r.is_recurring),
      overwriteSalaryStructureAmount: Boolean(r.overwrite_salary_structure_amount),
      deductFullTaxOnSelectedPayrollDate: Boolean(r.deduct_full_tax_on_selected_payroll_date),
      refDoctype: r.ref_doctype,
      refDocname: r.ref_docname,
      status:
        r.docstatus === 2
          ? "Cancelled"
          : r.docstatus === 1
            ? "Submitted"
            : "Draft",
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function getAdditionalSalary(
  name: string,
): Promise<AdditionalSalaryFull | null> {
  try {
    type Raw = {
      name: string;
      docstatus: 0 | 1 | 2;
      employee: string;
      employee_name: string | null;
      company: string | null;
      department: string | null;
      salary_component: string;
      amount: number | null;
      currency: string | null;
      payroll_date: string | null;
      from_date: string | null;
      to_date: string | null;
      is_recurring: 0 | 1 | null;
      overwrite_salary_structure_amount: 0 | 1 | null;
      deduct_full_tax_on_selected_payroll_date: 0 | 1 | null;
      ref_doctype: string | null;
      ref_docname: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Additional Salary", name },
      as: "user",
    });
    return {
      name: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      company: doc.company,
      department: doc.department,
      salaryComponent: doc.salary_component,
      amount: Number(doc.amount ?? 0),
      currency: doc.currency,
      payrollDate: doc.payroll_date,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      isRecurring: Boolean(doc.is_recurring),
      overwriteSalaryStructureAmount: Boolean(doc.overwrite_salary_structure_amount),
      deductFullTaxOnSelectedPayrollDate: Boolean(doc.deduct_full_tax_on_selected_payroll_date),
      refDoctype: doc.ref_doctype,
      refDocname: doc.ref_docname,
      status:
        doc.docstatus === 2
          ? "Cancelled"
          : doc.docstatus === 1
            ? "Submitted"
            : "Draft",
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    return null;
  }
}

export async function createAdditionalSalary(input: {
  employee: string;
  salaryComponent: string;
  amount: number;
  payrollDate: string;
  isRecurring?: boolean;
  fromDate?: string;
  toDate?: string;
  currency?: string;
  overwriteSalaryStructureAmount?: boolean;
  deductFullTaxOnSelectedPayrollDate?: boolean;
  company?: string;
}): Promise<string> {
  const doc: Record<string, unknown> = {
    doctype: "Additional Salary",
    employee: input.employee,
    salary_component: input.salaryComponent,
    amount: input.amount,
    payroll_date: input.payrollDate,
  };
  if (input.isRecurring) {
    doc.is_recurring = 1;
    if (input.fromDate) doc.from_date = input.fromDate;
    if (input.toDate) doc.to_date = input.toDate;
  }
  if (input.currency) doc.currency = input.currency;
  if (input.overwriteSalaryStructureAmount) doc.overwrite_salary_structure_amount = 1;
  if (input.deductFullTaxOnSelectedPayrollDate)
    doc.deduct_full_tax_on_selected_payroll_date = 1;
  if (input.company) doc.company = input.company;
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Retention Bonus — thin wrapper (server hook creates Additional Salary)
// ============================================================================

export type RetentionBonusRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  bonusPaymentDate: string;
  bonusAmount: number;
  salaryComponent: string;
  status: string;
  docstatus: 0 | 1 | 2;
};

export async function listRetentionBonuses(opts?: {
  employee?: string;
}): Promise<RetentionBonusRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      bonus_payment_date: string;
      bonus_amount: number | null;
      salary_component: string;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Retention Bonus",
        fields: [
          "name",
          "employee",
          "employee_name",
          "bonus_payment_date",
          "bonus_amount",
          "salary_component",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "bonus_payment_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      bonusPaymentDate: r.bonus_payment_date,
      bonusAmount: Number(r.bonus_amount ?? 0),
      salaryComponent: r.salary_component,
      status:
        r.docstatus === 2
          ? "Cancelled"
          : r.docstatus === 1
            ? "Submitted"
            : "Draft",
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function createRetentionBonus(input: {
  employee: string;
  bonusPaymentDate: string;
  bonusAmount: number;
  salaryComponent: string;
  company?: string;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Retention Bonus",
        employee: input.employee,
        bonus_payment_date: input.bonusPaymentDate,
        bonus_amount: input.bonusAmount,
        salary_component: input.salaryComponent,
        ...(input.company ? { company: input.company } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Employee Incentive — thin wrapper (server hook creates Additional Salary)
// ============================================================================

export type EmployeeIncentiveRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  incentiveAmount: number;
  payrollDate: string;
  salaryComponent: string;
  status: string;
  docstatus: 0 | 1 | 2;
};

export async function listEmployeeIncentives(opts?: {
  employee?: string;
}): Promise<EmployeeIncentiveRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      incentive_amount: number | null;
      payroll_date: string;
      salary_component: string;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Incentive",
        fields: [
          "name",
          "employee",
          "employee_name",
          "incentive_amount",
          "payroll_date",
          "salary_component",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "payroll_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      incentiveAmount: Number(r.incentive_amount ?? 0),
      payrollDate: r.payroll_date,
      salaryComponent: r.salary_component,
      status:
        r.docstatus === 2
          ? "Cancelled"
          : r.docstatus === 1
            ? "Submitted"
            : "Draft",
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function createEmployeeIncentive(input: {
  employee: string;
  incentiveAmount: number;
  payrollDate: string;
  salaryComponent: string;
  company?: string;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Employee Incentive",
        employee: input.employee,
        incentive_amount: input.incentiveAmount,
        payroll_date: input.payrollDate,
        salary_component: input.salaryComponent,
        ...(input.company ? { company: input.company } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}

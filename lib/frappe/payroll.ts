import "server-only";
import { frappeCall } from "./client";

export type SalarySlipRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  postingDate: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  netPay: number;
  grossPay: number;
  totalDeduction: number;
  docstatus: 0 | 1 | 2;
};

export async function listSalarySlips(opts: {
  status?: string;
  employee?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: SalarySlipRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: { net: number; gross: number; deductions: number };
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.employee) filters.push(["employee", "=", opts.employee]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    posting_date: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    net_pay: number | null;
    gross_pay: number | null;
    total_deduction: number | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, sums] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Slip",
        fields: [
          "name",
          "employee",
          "employee_name",
          "posting_date",
          "start_date",
          "end_date",
          "status",
          "net_pay",
          "gross_pay",
          "total_deduction",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "posting_date desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Salary Slip", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    // Sum across the matched set — we limit to 500 to bound the call.
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Slip",
        fields: ["net_pay", "gross_pay", "total_deduction"],
        filters: JSON.stringify(filters),
        limit_page_length: 500,
      },
      as: "user",
    }).catch(() => [] as Row[]),
  ]);

  const totals = sums.reduce(
    (acc, r) => ({
      net: acc.net + Number(r.net_pay ?? 0),
      gross: acc.gross + Number(r.gross_pay ?? 0),
      deductions: acc.deductions + Number(r.total_deduction ?? 0),
    }),
    { net: 0, gross: 0, deductions: 0 },
  );

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      postingDate: r.posting_date,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      netPay: Number(r.net_pay ?? 0),
      grossPay: Number(r.gross_pay ?? 0),
      totalDeduction: Number(r.total_deduction ?? 0),
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    totals,
  };
}

export const SALARY_SLIP_STATUSES = ["Draft", "Submitted", "Cancelled"];

// --- Payroll Entry ---------------------------------------------------------

export type PayrollEntryRow = {
  id: string;
  postingDate: string | null;
  startDate: string | null;
  endDate: string | null;
  payrollFrequency: string | null;
  status: string;
  company: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listPayrollEntries(opts: {
  status?: string;
  company?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: PayrollEntryRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { draft: number; submitted: number; cancelled: number };
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.company) filters.push(["company", "=", opts.company]);

  type Row = {
    name: string;
    posting_date: string | null;
    start_date: string | null;
    end_date: string | null;
    payroll_frequency: string | null;
    status: string;
    company: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, drafts, submits, cancels] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Entry",
        fields: [
          "name",
          "posting_date",
          "start_date",
          "end_date",
          "payroll_frequency",
          "status",
          "company",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "posting_date desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Payroll Entry", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Payroll Entry",
        filters: JSON.stringify([["docstatus", "=", 0]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Payroll Entry",
        filters: JSON.stringify([["docstatus", "=", 1]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Payroll Entry",
        filters: JSON.stringify([["docstatus", "=", 2]]),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      postingDate: r.posting_date,
      startDate: r.start_date,
      endDate: r.end_date,
      payrollFrequency: r.payroll_frequency,
      status: r.status,
      company: r.company,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: {
      draft: Number(drafts ?? 0),
      submitted: Number(submits ?? 0),
      cancelled: Number(cancels ?? 0),
    },
  };
}

export const PAYROLL_ENTRY_STATUSES = [
  "Draft",
  "Submitted",
  "Queued",
  "Failed",
  "Cancelled",
];

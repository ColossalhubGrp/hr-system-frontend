import "server-only";
import { frappeCall } from "./client";

export type LoanRow = {
  id: string;
  applicant: string;
  applicantName: string | null;
  loanType: string | null;
  status: string;
  loanAmount: number;
  totalPayable: number;
  totalPaid: number;
  postingDate: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listLoans(opts: {
  status?: string;
  applicant?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: LoanRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: { outstanding: number; disbursed: number; repaid: number };
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.applicant) filters.push(["applicant", "=", opts.applicant]);

  type Row = {
    name: string;
    applicant: string;
    applicant_name: string | null;
    loan_type: string | null;
    status: string;
    loan_amount: number | null;
    total_payment: number | null;
    total_amount_paid: number | null;
    posting_date: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, allForTotals] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Loan",
        fields: [
          "name",
          "applicant",
          "applicant_name",
          "loan_type",
          "status",
          "loan_amount",
          "total_payment",
          "total_amount_paid",
          "posting_date",
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
      args: { doctype: "Loan", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Loan",
        fields: ["loan_amount", "total_payment", "total_amount_paid"],
        filters: JSON.stringify(filters),
        limit_page_length: 500,
      },
      as: "user",
    }).catch(() => [] as Row[]),
  ]);

  const totals = allForTotals.reduce(
    (acc, r) => {
      const paid = Number(r.total_amount_paid ?? 0);
      const payable = Number(r.total_payment ?? 0);
      const disbursed = Number(r.loan_amount ?? 0);
      return {
        outstanding: acc.outstanding + Math.max(0, payable - paid),
        disbursed: acc.disbursed + disbursed,
        repaid: acc.repaid + paid,
      };
    },
    { outstanding: 0, disbursed: 0, repaid: 0 },
  );

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      applicant: r.applicant,
      applicantName: r.applicant_name,
      loanType: r.loan_type,
      status: r.status,
      loanAmount: Number(r.loan_amount ?? 0),
      totalPayable: Number(r.total_payment ?? 0),
      totalPaid: Number(r.total_amount_paid ?? 0),
      postingDate: r.posting_date,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    totals,
  };
}

export const LOAN_STATUSES = [
  "Sanctioned",
  "Partially Disbursed",
  "Disbursed",
  "Closed",
];

// --- Loan Application -----------------------------------------------------

export type LoanApplicationRow = {
  id: string;
  applicant: string;
  applicantName: string | null;
  loanType: string | null;
  status: string;
  loanAmount: number;
  postingDate: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listLoanApplications(opts: {
  status?: string;
  applicant?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: LoanApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { open: number; approved: number; rejected: number };
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.applicant) filters.push(["applicant", "=", opts.applicant]);

  type Row = {
    name: string;
    applicant: string;
    applicant_name: string | null;
    loan_type: string | null;
    status: string;
    loan_amount: number | null;
    posting_date: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, open, approved, rejected] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Loan Application",
        fields: [
          "name",
          "applicant",
          "applicant_name",
          "loan_type",
          "status",
          "loan_amount",
          "posting_date",
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
      args: { doctype: "Loan Application", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Loan Application",
        filters: JSON.stringify([["status", "=", "Open"]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Loan Application",
        filters: JSON.stringify([["status", "=", "Approved"]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Loan Application",
        filters: JSON.stringify([["status", "=", "Rejected"]]),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      applicant: r.applicant,
      applicantName: r.applicant_name,
      loanType: r.loan_type,
      status: r.status,
      loanAmount: Number(r.loan_amount ?? 0),
      postingDate: r.posting_date,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: {
      open: Number(open ?? 0),
      approved: Number(approved ?? 0),
      rejected: Number(rejected ?? 0),
    },
  };
}

export const LOAN_APPLICATION_STATUSES = ["Open", "Approved", "Rejected"];

// --- Loan Type ------------------------------------------------------------

export type LoanTypeRow = {
  id: string;
  name: string;
  isTermLoan: boolean;
  maxLoanAmount: number;
  rateOfInterest: number;
  description: string | null;
  disabled: boolean;
};

export async function listLoanTypes(opts: {
  enabled?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: LoanTypeRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, number]> = [];
  if (opts.enabled === "Yes") filters.push(["disabled", "=", 0]);
  if (opts.enabled === "No") filters.push(["disabled", "=", 1]);

  type Row = {
    name: string;
    is_term_loan: 0 | 1 | boolean | null;
    maximum_loan_amount: number | null;
    rate_of_interest: number | null;
    description: string | null;
    disabled: 0 | 1 | boolean | null;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Loan Type",
        fields: [
          "name",
          "is_term_loan",
          "maximum_loan_amount",
          "rate_of_interest",
          "description",
          "disabled",
        ],
        filters: JSON.stringify(filters),
        order_by: "name asc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Loan Type", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      name: r.name,
      isTermLoan: Boolean(r.is_term_loan),
      maxLoanAmount: Number(r.maximum_loan_amount ?? 0),
      rateOfInterest: Number(r.rate_of_interest ?? 0),
      description: r.description,
      disabled: Boolean(r.disabled),
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

export type ExpenseClaimStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Paid"
  | "Cancelled";

export type ExpenseClaimRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  postingDate: string;
  totalClaimedAmount: number;
  totalSanctionedAmount: number;
  status: string;
  approvalStatus: string;
  company: string | null;
  docstatus: 0 | 1 | 2;
};

export type ExpenseClaimList = {
  rows: ExpenseClaimRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    paid: number;
    sanctionedTotal: number;
  };
};

const STATUSES: ExpenseClaimStatus[] = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "Paid",
  "Cancelled",
];

export async function listExpenseClaims(opts: {
  status?: string;
  employee?: string;
  page?: number;
  pageSize?: number;
}): Promise<ExpenseClaimList> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.employee) filters.push(["employee", "=", opts.employee]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    posting_date: string;
    total_claimed_amount: number | null;
    total_sanctioned_amount: number | null;
    status: string;
    approval_status: string;
    company: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, perStatus, sanctioned] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Expense Claim",
        fields: [
          "name",
          "employee",
          "employee_name",
          "posting_date",
          "total_claimed_amount",
          "total_sanctioned_amount",
          "status",
          "approval_status",
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
      args: { doctype: "Expense Claim", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    Promise.all(
      ["Draft", "Submitted", "Approved", "Rejected", "Paid"].map((s) =>
        frappeCall<number>({
          method: "frappe.client.get_count",
          args: {
            doctype: "Expense Claim",
            filters: JSON.stringify([
              ...(opts.employee ? [["employee", "=", opts.employee] as [string, string, string]] : []),
              ["status", "=", s],
            ]),
          },
          as: "user",
        })
          .catch(() => 0)
          .then((c) => [s, Number(c ?? 0)] as const),
      ),
    ),
    frappeCall<Array<{ total_sanctioned_amount: number | null }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Expense Claim",
        fields: ["total_sanctioned_amount"],
        filters: JSON.stringify([
          ...(opts.employee ? [["employee", "=", opts.employee] as [string, string, string]] : []),
          ["status", "in", ["Approved", "Paid"]],
        ]),
        limit_page_length: 1000,
      },
      as: "user",
    }).catch(() => []),
  ]);

  const counts = Object.fromEntries(perStatus);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      postingDate: r.posting_date,
      totalClaimedAmount: Number(r.total_claimed_amount ?? 0),
      totalSanctionedAmount: Number(r.total_sanctioned_amount ?? 0),
      status: r.status,
      approvalStatus: r.approval_status,
      company: r.company,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: {
      draft: counts.Draft ?? 0,
      submitted: counts.Submitted ?? 0,
      approved: counts.Approved ?? 0,
      rejected: counts.Rejected ?? 0,
      paid: counts.Paid ?? 0,
      sanctionedTotal: sanctioned.reduce(
        (acc, r) => acc + Number(r.total_sanctioned_amount ?? 0),
        0,
      ),
    },
  };
}

// --- single doc ------------------------------------------------------------

export type ExpenseClaim = {
  id: string;
  docstatus: 0 | 1 | 2;
  employee: string;
  employeeName: string | null;
  postingDate: string;
  totalClaimedAmount: number;
  totalSanctionedAmount: number;
  status: string;
  approvalStatus: string;
  expenseApprover: string | null;
  company: string | null;
  remark: string | null;
  expenses: Array<{
    expenseDate: string;
    expenseType: string | null;
    description: string | null;
    amount: number;
    sanctionedAmount: number;
  }>;
};

type RawClaim = {
  name: string;
  docstatus: 0 | 1 | 2;
  employee: string;
  employee_name: string | null;
  posting_date: string;
  total_claimed_amount: number | null;
  total_sanctioned_amount: number | null;
  status: string;
  approval_status: string;
  expense_approver: string | null;
  company: string | null;
  remark: string | null;
  expenses: Array<{
    expense_date: string;
    expense_type: string | null;
    description: string | null;
    amount: number | null;
    sanctioned_amount: number | null;
  }>;
};

export async function getExpenseClaim(id: string): Promise<ExpenseClaim | null> {
  try {
    const doc = await frappeCall<RawClaim>({
      method: "frappe.client.get",
      args: { doctype: "Expense Claim", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      postingDate: doc.posting_date,
      totalClaimedAmount: Number(doc.total_claimed_amount ?? 0),
      totalSanctionedAmount: Number(doc.total_sanctioned_amount ?? 0),
      status: doc.status,
      approvalStatus: doc.approval_status,
      expenseApprover: doc.expense_approver,
      company: doc.company,
      remark: doc.remark,
      expenses: (doc.expenses ?? []).map((e) => ({
        expenseDate: e.expense_date,
        expenseType: e.expense_type,
        description: e.description,
        amount: Number(e.amount ?? 0),
        sanctionedAmount: Number(e.sanctioned_amount ?? 0),
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

// --- writes ----------------------------------------------------------------

export type ExpenseClaimCreateInput = {
  employee: string;
  posting_date: string;
  company: string;
  remark?: string;
  approver?: string;
  expenses: Array<{
    expense_date: string;
    expense_type: string;
    description?: string;
    amount: number;
  }>;
};

export async function createExpenseClaim(
  input: ExpenseClaimCreateInput,
): Promise<string> {
  const doc: Record<string, unknown> = {
    doctype: "Expense Claim",
    employee: input.employee,
    posting_date: input.posting_date,
    company: input.company,
    expenses: input.expenses.map((e) => ({
      doctype: "Expense Claim Detail",
      expense_date: e.expense_date,
      expense_type: e.expense_type,
      description: e.description,
      amount: e.amount,
      sanctioned_amount: e.amount,
    })),
  };
  if (input.remark) doc.remark = input.remark;
  if (input.approver) doc.expense_approver = input.approver;

  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

/** Approve or reject a draft expense claim by setting approval_status and
 *  submitting. */
export async function decideExpenseClaim(
  id: string,
  decision: "Approved" | "Rejected",
): Promise<void> {
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Expense Claim", name: id },
    as: "user",
  });
  full.approval_status = decision;
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

export const EXPENSE_CLAIM_STATUSES = STATUSES;

export async function listExpenseTypes(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Expense Claim Type",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 100,
      },
      as: "user",
    });
    return rows.map((r) => r.name).filter(Boolean);
  } catch {
    return [];
  }
}

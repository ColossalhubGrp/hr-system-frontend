import "server-only";
import { FrappeRequestError, frappeCall } from "./client";
import { resolveUserDisplayName } from "./employee-approvers";

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
    /** New claims awaiting approval. */
    draft: number;
    /** Approved but not yet reimbursed (Frappe status "Unpaid" +
     *  legacy "Approved"). Represents money the company owes. */
    owed: number;
    /** Approved and fully reimbursed. */
    paid: number;
    /** Rejected at approval. */
    rejected: number;
    /** Sum of sanctioned amounts across owed + paid — total value
     *  committed to employees (whether paid out yet or not). */
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
      // "Unpaid" is Frappe HR's status for approved-but-not-yet-paid.
      // Legacy docs sometimes sit at "Approved" too, so we sum both
      // into the "owed" tile.
      ["Draft", "Unpaid", "Approved", "Rejected", "Paid"].map((s) =>
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
          ["status", "in", ["Approved", "Unpaid", "Paid"]],
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
      owed: (counts.Unpaid ?? 0) + (counts.Approved ?? 0),
      paid: counts.Paid ?? 0,
      rejected: counts.Rejected ?? 0,
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
  expenseApproverName: string | null;
  company: string | null;
  remark: string | null;
  // Accounting — required by Frappe to submit. Values may be null on a
  // freshly-created claim if the company defaults aren't set; HR fills
  // them in on the detail page before approving.
  payableAccount: string | null;
  costCenter: string | null;
  isPaid: boolean;
  modeOfPayment: string | null;
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
  payable_account: string | null;
  cost_center: string | null;
  is_paid: 0 | 1 | null;
  mode_of_payment: string | null;
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
    const expenseApproverName = doc.expense_approver
      ? (await resolveUserDisplayName(doc.expense_approver)) ?? null
      : null;
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
      expenseApproverName,
      company: doc.company,
      remark: doc.remark,
      payableAccount: doc.payable_account,
      costCenter: doc.cost_center,
      isPaid: Boolean(doc.is_paid),
      modeOfPayment: doc.mode_of_payment,
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
  // Accounting fields — optional at insert time (Frappe fetch_from will
  // pull them from company defaults if the caller doesn't set them). Only
  // become mandatory at submit time; that's when HR fills any that are
  // still empty via the decision bar.
  payable_account?: string;
  cost_center?: string;
  is_paid?: boolean;
  mode_of_payment?: string;
  expenses: Array<{
    expense_date: string;
    expense_type: string;
    description?: string;
    amount: number;
  }>;
};

export type ExpenseAccountingInput = {
  payable_account?: string;
  cost_center?: string;
  is_paid?: boolean;
  mode_of_payment?: string;
  remark?: string;
};

export async function createExpenseClaim(
  input: ExpenseClaimCreateInput,
): Promise<string> {
  // Frappe's Expense Claim schema treats exchange_rate as required
  // and rejects the API insert with "Value missing for Expense
  // Claim: Exchange Rate" when it's not set. Defaults to 1 —
  // correct when the claim is filed in the company's own currency
  // (the common case). Multi-currency claims would need the caller
  // to pass a real rate; not modeled in the UI yet.
  const doc: Record<string, unknown> = {
    doctype: "Expense Claim",
    employee: input.employee,
    posting_date: input.posting_date,
    company: input.company,
    exchange_rate: 1,
    expenses: input.expenses.map((e) => ({
      doctype: "Expense Claim Detail",
      expense_date: e.expense_date,
      expense_type: e.expense_type,
      description: e.description,
      amount: e.amount,
      sanctioned_amount: e.amount,
      // Frappe validates cost_center on each expense line at submit
      // time. Propagate the parent-level pick here so employees don't
      // have to fill it per row, and HR isn't left picking it later.
      ...(input.cost_center && { cost_center: input.cost_center }),
    })),
  };
  if (input.remark) doc.remark = input.remark;
  if (input.approver) doc.expense_approver = input.approver;
  if (input.payable_account) doc.payable_account = input.payable_account;
  if (input.cost_center) doc.cost_center = input.cost_center;
  if (input.is_paid) doc.is_paid = 1;
  if (input.mode_of_payment) doc.mode_of_payment = input.mode_of_payment;

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

/** HR-admin override path — bypasses DocPerm via ignore_permissions
 *  on the backend so admins can approve without needing per-doctype
 *  submit rights on Expense Claim. Backend re-checks the HR admin
 *  role set; never a bypass-for-anyone path. */
export async function adminDecideExpenseClaim(
  id: string,
  decision: "Approved" | "Rejected",
  accounting?: ExpenseAccountingInput,
): Promise<void> {
  await frappeCall<unknown>({
    method: "recruitment_app.api.approvals.admin_decide_expense_claim",
    args: {
      name: id,
      decision,
      ...(accounting?.payable_account && { payable_account: accounting.payable_account }),
      ...(accounting?.cost_center && { cost_center: accounting.cost_center }),
      ...(accounting?.is_paid !== undefined && { is_paid: accounting.is_paid ? 1 : 0 }),
      ...(accounting?.mode_of_payment && { mode_of_payment: accounting.mode_of_payment }),
      ...(accounting?.remark && { remark: accounting.remark }),
    },
    verb: "POST",
    as: "user",
  });
}

/** Save accounting fields on a DRAFT Expense Claim without submitting.
 *  Used when HR wants to fill in payable_account etc. from the detail
 *  page but isn't ready to approve yet. Backend refuses submitted docs. */
export async function saveExpenseClaimAccounting(
  id: string,
  input: ExpenseAccountingInput,
): Promise<void> {
  await frappeCall<unknown>({
    method: "recruitment_app.api.approvals.save_expense_claim_accounting",
    args: {
      name: id,
      ...(input.payable_account !== undefined && { payable_account: input.payable_account }),
      ...(input.cost_center !== undefined && { cost_center: input.cost_center }),
      ...(input.is_paid !== undefined && { is_paid: input.is_paid ? 1 : 0 }),
      ...(input.mode_of_payment !== undefined && { mode_of_payment: input.mode_of_payment }),
      ...(input.remark !== undefined && { remark: input.remark }),
    },
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

/** Payable accounts for a given company. Same filter shape as the
 *  payroll new-pay-run form uses — Liability, not group. */
export async function listPayableAccounts(
  company: string | null,
): Promise<Array<{ value: string; label: string }>> {
  if (!company) return [];
  try {
    const rows = await frappeCall<Array<{ name: string; account_name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Account",
        fields: ["name", "account_name"],
        filters: JSON.stringify([
          ["company", "=", company],
          ["root_type", "=", "Liability"],
          ["is_group", "=", 0],
        ]),
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({ value: r.name, label: r.account_name || r.name }));
  } catch {
    return [];
  }
}

/** Cost Centers for a given company (leaf nodes only). */
export async function listCostCenters(
  company: string | null,
): Promise<Array<{ value: string; label: string }>> {
  if (!company) return [];
  try {
    const rows = await frappeCall<Array<{ name: string; cost_center_name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Cost Center",
        fields: ["name", "cost_center_name"],
        filters: JSON.stringify([
          ["company", "=", company],
          ["is_group", "=", 0],
        ]),
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({ value: r.name, label: r.cost_center_name || r.name }));
  } catch {
    return [];
  }
}

/** Bank + Cash accounts a Payment Entry's "Paid From" can draw from,
 *  for the given company. Only leaf accounts (is_group=0) with
 *  account_type in (Bank, Cash). */
export async function listCashOrBankAccounts(
  company: string | null,
): Promise<Array<{ value: string; label: string }>> {
  if (!company) return [];
  try {
    const rows = await frappeCall<Array<{ name: string; account_name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Account",
        fields: ["name", "account_name"],
        filters: JSON.stringify([
          ["company", "=", company],
          ["account_type", "in", ["Bank", "Cash"]],
          ["is_group", "=", 0],
        ]),
        order_by: "name asc",
        limit_page_length: 100,
      },
      as: "user",
    });
    return rows.map((r) => ({ value: r.name, label: r.account_name || r.name }));
  } catch {
    return [];
  }
}

export type RecordPaymentInput = {
  claim: string;
  paid_from: string;
  amount: number;
  posting_date: string;
  mode_of_payment?: string;
  reference_no?: string;
  reference_date?: string;
};

/** Post a Payment Entry that settles an approved Expense Claim. Frappe
 *  flips the claim status Unpaid → Paid on the server side. */
export async function recordExpenseClaimPayment(
  input: RecordPaymentInput,
): Promise<{ payment_entry: string; claim_status: string; amount: number }> {
  return frappeCall<{ payment_entry: string; claim_status: string; amount: number }>({
    method: "recruitment_app.api.approvals.record_expense_claim_payment",
    verb: "POST",
    args: {
      claim: input.claim,
      paid_from: input.paid_from,
      amount: input.amount,
      posting_date: input.posting_date,
      ...(input.mode_of_payment && { mode_of_payment: input.mode_of_payment }),
      ...(input.reference_no && { reference_no: input.reference_no }),
      ...(input.reference_date && { reference_date: input.reference_date }),
    },
    as: "user",
  });
}

/** Configure the default Bank/Cash account for a Mode of Payment on a
 *  given company. Fixes "Please set default Cash or Bank account in
 *  Mode of Payment X" when HR ticks is_paid + a mode that has no
 *  per-company default. */
export async function setModeOfPaymentDefaultAccount(input: {
  mode: string;
  company: string;
  account: string;
}): Promise<void> {
  await frappeCall<unknown>({
    method: "recruitment_app.api.approvals.set_mode_of_payment_default_account",
    verb: "POST",
    args: input,
    as: "user",
  });
}

/** Modes of Payment (Cash / Bank / Cheque / …). Only surface enabled ones. */
export async function listModesOfPayment(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Mode of Payment",
        fields: ["name"],
        filters: JSON.stringify([["enabled", "=", 1]]),
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

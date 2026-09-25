import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

/**
 * Server-side helpers for the Accounting module.
 *
 * Backend is upstream ERPNext (already installed on api.colossalhub.com) —
 * we call its stock DocTypes (Journal Entry, Account, Cost Center,
 * Fiscal Year, Company) via frappe.client.* whitelisted methods. No
 * custom Python wrapper needed for the shell phase; if we later want
 * enrichment (e.g. balance-as-of on an Account row) we add a
 * whitelisted method in recruitment_app.api.accounting.
 */

// ── Types ────────────────────────────────────────────────────────

export type VoucherType =
  | "Journal Entry"
  | "Bank Entry"
  | "Cash Entry"
  | "Credit Card Entry"
  | "Debit Note"
  | "Credit Note"
  | "Contra Entry"
  | "Excise Entry"
  | "Write Off Entry"
  | "Opening Entry"
  | "Depreciation Entry"
  | "Exchange Rate Revaluation";

export const VOUCHER_TYPES: VoucherType[] = [
  "Journal Entry",
  "Bank Entry",
  "Cash Entry",
  "Credit Card Entry",
  "Debit Note",
  "Credit Note",
  "Contra Entry",
  "Write Off Entry",
  "Opening Entry",
  "Depreciation Entry",
  "Exchange Rate Revaluation",
];

export type JournalEntryRow = {
  name: string;
  voucherType: string;
  postingDate: string;
  company: string;
  totalDebit: number;
  totalCredit: number;
  userRemark: string | null;
  chequeNo: string | null;
  chequeDate: string | null;
  docstatus: 0 | 1 | 2;
};

export type JournalEntryList = {
  rows: JournalEntryRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    /** Unsubmitted drafts — need review before posting to GL. */
    draft: number;
    /** Posted vouchers — money moved. */
    submitted: number;
    /** Cancelled reversals. */
    cancelled: number;
    /** Sum of submitted debits (== credits, by definition). */
    postedTotal: number;
  };
};

export type JournalEntryLine = {
  idx: number;
  account: string;
  partyType: string | null;
  party: string | null;
  debitInAccountCurrency: number;
  creditInAccountCurrency: number;
  accountCurrency: string | null;
  costCenter: string | null;
  referenceType: string | null;
  referenceName: string | null;
  userRemark: string | null;
};

export type JournalEntryDetail = {
  name: string;
  voucherType: string;
  postingDate: string;
  company: string;
  chequeNo: string | null;
  chequeDate: string | null;
  userRemark: string | null;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  multiCurrency: boolean;
  docstatus: 0 | 1 | 2;
  amendedFrom: string | null;
  accounts: JournalEntryLine[];
};

export type AccountOption = {
  name: string;
  accountName: string;
  accountType: string | null;
  rootType: string | null;
  isGroup: boolean;
  currency: string | null;
};

// ── List ─────────────────────────────────────────────────────────

export async function listJournalEntries(opts: {
  docstatus?: number;
  company?: string;
  voucherType?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<JournalEntryList> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 25));

  const filters: [string, string, unknown][] = [];
  if (opts.docstatus !== undefined) filters.push(["docstatus", "=", opts.docstatus]);
  if (opts.company) filters.push(["company", "=", opts.company]);
  if (opts.voucherType) filters.push(["voucher_type", "=", opts.voucherType]);

  const [rowsRaw, totalRaw, counts] = await Promise.all([
    frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Journal Entry",
        fields: [
          "name",
          "voucher_type",
          "posting_date",
          "company",
          "total_debit",
          "total_credit",
          "user_remark",
          "cheque_no",
          "cheque_date",
          "docstatus",
        ],
        filters,
        order_by: "posting_date desc, creation desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
    }),
    frappeCall<{ count?: number } | number>({
      method: "frappe.client.get_count",
      as: "user",
      args: { doctype: "Journal Entry", filters },
    }),
    fetchCounts(opts.company, opts.voucherType),
  ]);

  const total = typeof totalRaw === "number" ? totalRaw : (totalRaw?.count ?? 0);

  const rows: JournalEntryRow[] = rowsRaw.map((r) => ({
    name: String(r.name ?? ""),
    voucherType: String(r.voucher_type ?? "Journal Entry"),
    postingDate: String(r.posting_date ?? ""),
    company: String(r.company ?? ""),
    totalDebit: Number(r.total_debit ?? 0),
    totalCredit: Number(r.total_credit ?? 0),
    userRemark: (r.user_remark as string | null) ?? null,
    chequeNo: (r.cheque_no as string | null) ?? null,
    chequeDate: (r.cheque_date as string | null) ?? null,
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
  }));

  return { rows, total, page, pageSize, counts };
}

async function fetchCounts(
  company: string | undefined,
  voucherType: string | undefined,
): Promise<JournalEntryList["counts"]> {
  const base: [string, string, unknown][] = [];
  if (company) base.push(["company", "=", company]);
  if (voucherType) base.push(["voucher_type", "=", voucherType]);

  const [draft, submitted, cancelled, postedSum] = await Promise.all([
    countBy([...base, ["docstatus", "=", 0]]),
    countBy([...base, ["docstatus", "=", 1]]),
    countBy([...base, ["docstatus", "=", 2]]),
    sumSubmittedDebit(base),
  ]);
  return { draft, submitted, cancelled, postedTotal: postedSum };
}

async function countBy(filters: [string, string, unknown][]): Promise<number> {
  const raw = await frappeCall<{ count?: number } | number>({
    method: "frappe.client.get_count",
    as: "user",
    args: { doctype: "Journal Entry", filters },
  });
  return typeof raw === "number" ? raw : (raw?.count ?? 0);
}

async function sumSubmittedDebit(baseFilters: [string, string, unknown][]): Promise<number> {
  try {
    // ERPNext's get_list with `sum` isn't a stock op — fetch and sum.
    const rows = await frappeCall<Array<{ total_debit?: number }>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Journal Entry",
        fields: ["total_debit"],
        filters: [...baseFilters, ["docstatus", "=", 1]],
        limit_page_length: 0,
      },
    });
    return rows.reduce((acc, r) => acc + Number(r?.total_debit ?? 0), 0);
  } catch {
    return 0;
  }
}

// ── Detail ───────────────────────────────────────────────────────

export async function getJournalEntry(name: string): Promise<JournalEntryDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Journal Entry", name },
    });

    const linesRaw = (doc.accounts as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      voucherType: String(doc.voucher_type ?? "Journal Entry"),
      postingDate: String(doc.posting_date ?? ""),
      company: String(doc.company ?? ""),
      chequeNo: (doc.cheque_no as string | null) ?? null,
      chequeDate: (doc.cheque_date as string | null) ?? null,
      userRemark: (doc.user_remark as string | null) ?? null,
      totalDebit: Number(doc.total_debit ?? 0),
      totalCredit: Number(doc.total_credit ?? 0),
      difference: Number(doc.difference ?? 0),
      multiCurrency: Number(doc.multi_currency ?? 0) === 1,
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      amendedFrom: (doc.amended_from as string | null) ?? null,
      accounts: linesRaw.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        account: String(r.account ?? ""),
        partyType: (r.party_type as string | null) ?? null,
        party: (r.party as string | null) ?? null,
        debitInAccountCurrency: Number(r.debit_in_account_currency ?? 0),
        creditInAccountCurrency: Number(r.credit_in_account_currency ?? 0),
        accountCurrency: (r.account_currency as string | null) ?? null,
        costCenter: (r.cost_center as string | null) ?? null,
        referenceType: (r.reference_type as string | null) ?? null,
        referenceName: (r.reference_name as string | null) ?? null,
        userRemark: (r.user_remark as string | null) ?? null,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

// ── Create / mutate ──────────────────────────────────────────────

export type JournalEntryCreateInput = {
  voucherType: VoucherType;
  postingDate: string;
  company: string;
  chequeNo?: string;
  chequeDate?: string;
  userRemark?: string;
  accounts: Array<{
    account: string;
    partyType?: string;
    party?: string;
    debit?: number;
    credit?: number;
    costCenter?: string;
    userRemark?: string;
  }>;
};

export async function createJournalEntry(input: JournalEntryCreateInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Journal Entry",
    voucher_type: input.voucherType,
    posting_date: input.postingDate,
    company: input.company,
    cheque_no: input.chequeNo || undefined,
    cheque_date: input.chequeDate || undefined,
    user_remark: input.userRemark || undefined,
    accounts: input.accounts.map((line) => ({
      account: line.account,
      party_type: line.partyType || undefined,
      party: line.party || undefined,
      debit_in_account_currency: Number(line.debit ?? 0) || 0,
      credit_in_account_currency: Number(line.credit ?? 0) || 0,
      cost_center: line.costCenter || undefined,
      user_remark: line.userRemark || undefined,
    })),
  };

  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function submitJournalEntry(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Journal Entry", name } },
  });
}

export async function cancelJournalEntry(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Journal Entry", name },
  });
}

// ── Lookups (for the form) ───────────────────────────────────────

export async function listCompanies(): Promise<Array<{ name: string; abbr: string; currency: string }>> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Company",
      fields: ["name", "abbr", "default_currency"],
      order_by: "name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    abbr: String(r.abbr ?? ""),
    currency: String(r.default_currency ?? "USD"),
  }));
}

export async function listAccounts(company: string, opts: { search?: string; limit?: number } = {}): Promise<AccountOption[]> {
  const limit = Math.min(50, opts.limit ?? 20);
  const filters: [string, string, unknown][] = [
    ["company", "=", company],
    ["is_group", "=", 0],
    ["disabled", "=", 0],
  ];
  if (opts.search) filters.push(["account_name", "like", `%${opts.search}%`]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Account",
      fields: [
        "name",
        "account_name",
        "account_type",
        "root_type",
        "is_group",
        "account_currency",
      ],
      filters,
      order_by: "account_name asc",
      limit_page_length: limit,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    accountName: String(r.account_name ?? ""),
    accountType: (r.account_type as string | null) ?? null,
    rootType: (r.root_type as string | null) ?? null,
    isGroup: Number(r.is_group ?? 0) === 1,
    currency: (r.account_currency as string | null) ?? null,
  }));
}

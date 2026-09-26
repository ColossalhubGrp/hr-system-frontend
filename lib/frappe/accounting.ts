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

// ── Payment Entry ────────────────────────────────────────────────

export type PaymentType = "Receive" | "Pay" | "Internal Transfer";
export const PAYMENT_TYPES: PaymentType[] = ["Receive", "Pay", "Internal Transfer"];

export type PartyType = "Customer" | "Supplier" | "Employee" | "Shareholder" | "Student" | "Donor";
export const PARTY_TYPES: PartyType[] = ["Customer", "Supplier", "Employee", "Shareholder"];

export type PaymentEntryRow = {
  name: string;
  paymentType: string;
  postingDate: string;
  company: string;
  partyType: string | null;
  party: string | null;
  partyName: string | null;
  paidFrom: string | null;
  paidTo: string | null;
  paidAmount: number;
  receivedAmount: number;
  referenceNo: string | null;
  referenceDate: string | null;
  modeOfPayment: string | null;
  docstatus: 0 | 1 | 2;
};

export type PaymentEntryList = {
  rows: PaymentEntryRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    draft: number;
    submitted: number;
    cancelled: number;
    receivedTotal: number;
    paidTotal: number;
  };
};

export type PaymentEntryDetail = {
  name: string;
  paymentType: string;
  postingDate: string;
  company: string;
  partyType: string | null;
  party: string | null;
  partyName: string | null;
  paidFrom: string | null;
  paidTo: string | null;
  paidFromCurrency: string | null;
  paidToCurrency: string | null;
  paidAmount: number;
  receivedAmount: number;
  sourceExchangeRate: number;
  targetExchangeRate: number;
  modeOfPayment: string | null;
  referenceNo: string | null;
  referenceDate: string | null;
  remarks: string | null;
  allocatedAmount: number;
  unallocatedAmount: number;
  docstatus: 0 | 1 | 2;
  references: Array<{
    idx: number;
    referenceDoctype: string;
    referenceName: string;
    totalAmount: number;
    outstandingAmount: number;
    allocatedAmount: number;
  }>;
};

export async function listPaymentEntries(opts: {
  docstatus?: number;
  company?: string;
  paymentType?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaymentEntryList> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 25));

  const filters: [string, string, unknown][] = [];
  if (opts.docstatus !== undefined) filters.push(["docstatus", "=", opts.docstatus]);
  if (opts.company) filters.push(["company", "=", opts.company]);
  if (opts.paymentType) filters.push(["payment_type", "=", opts.paymentType]);

  const [rowsRaw, totalRaw, counts] = await Promise.all([
    frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Payment Entry",
        fields: [
          "name",
          "payment_type",
          "posting_date",
          "company",
          "party_type",
          "party",
          "party_name",
          "paid_from",
          "paid_to",
          "paid_amount",
          "received_amount",
          "reference_no",
          "reference_date",
          "mode_of_payment",
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
      args: { doctype: "Payment Entry", filters },
    }),
    fetchPaymentCounts(opts.company, opts.paymentType),
  ]);

  const total = typeof totalRaw === "number" ? totalRaw : (totalRaw?.count ?? 0);

  const rows: PaymentEntryRow[] = rowsRaw.map((r) => ({
    name: String(r.name ?? ""),
    paymentType: String(r.payment_type ?? "Receive"),
    postingDate: String(r.posting_date ?? ""),
    company: String(r.company ?? ""),
    partyType: (r.party_type as string | null) ?? null,
    party: (r.party as string | null) ?? null,
    partyName: (r.party_name as string | null) ?? null,
    paidFrom: (r.paid_from as string | null) ?? null,
    paidTo: (r.paid_to as string | null) ?? null,
    paidAmount: Number(r.paid_amount ?? 0),
    receivedAmount: Number(r.received_amount ?? 0),
    referenceNo: (r.reference_no as string | null) ?? null,
    referenceDate: (r.reference_date as string | null) ?? null,
    modeOfPayment: (r.mode_of_payment as string | null) ?? null,
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
  }));

  return { rows, total, page, pageSize, counts };
}

async function fetchPaymentCounts(
  company: string | undefined,
  paymentType: string | undefined,
): Promise<PaymentEntryList["counts"]> {
  const base: [string, string, unknown][] = [];
  if (company) base.push(["company", "=", company]);
  if (paymentType) base.push(["payment_type", "=", paymentType]);

  const [draft, submitted, cancelled, recvSum, paidSum] = await Promise.all([
    countPayments([...base, ["docstatus", "=", 0]]),
    countPayments([...base, ["docstatus", "=", 1]]),
    countPayments([...base, ["docstatus", "=", 2]]),
    sumPaymentField([...base, ["docstatus", "=", 1], ["payment_type", "=", "Receive"]], "received_amount"),
    sumPaymentField([...base, ["docstatus", "=", 1], ["payment_type", "=", "Pay"]], "paid_amount"),
  ]);
  return {
    draft,
    submitted,
    cancelled,
    receivedTotal: recvSum,
    paidTotal: paidSum,
  };
}

async function countPayments(filters: [string, string, unknown][]): Promise<number> {
  const raw = await frappeCall<{ count?: number } | number>({
    method: "frappe.client.get_count",
    as: "user",
    args: { doctype: "Payment Entry", filters },
  });
  return typeof raw === "number" ? raw : (raw?.count ?? 0);
}

async function sumPaymentField(
  filters: [string, string, unknown][],
  field: "paid_amount" | "received_amount",
): Promise<number> {
  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Payment Entry",
        fields: [field],
        filters,
        limit_page_length: 0,
      },
    });
    return rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function getPaymentEntry(name: string): Promise<PaymentEntryDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Payment Entry", name },
    });
    const refs = (doc.references as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      paymentType: String(doc.payment_type ?? "Receive"),
      postingDate: String(doc.posting_date ?? ""),
      company: String(doc.company ?? ""),
      partyType: (doc.party_type as string | null) ?? null,
      party: (doc.party as string | null) ?? null,
      partyName: (doc.party_name as string | null) ?? null,
      paidFrom: (doc.paid_from as string | null) ?? null,
      paidTo: (doc.paid_to as string | null) ?? null,
      paidFromCurrency: (doc.paid_from_account_currency as string | null) ?? null,
      paidToCurrency: (doc.paid_to_account_currency as string | null) ?? null,
      paidAmount: Number(doc.paid_amount ?? 0),
      receivedAmount: Number(doc.received_amount ?? 0),
      sourceExchangeRate: Number(doc.source_exchange_rate ?? 1),
      targetExchangeRate: Number(doc.target_exchange_rate ?? 1),
      modeOfPayment: (doc.mode_of_payment as string | null) ?? null,
      referenceNo: (doc.reference_no as string | null) ?? null,
      referenceDate: (doc.reference_date as string | null) ?? null,
      remarks: (doc.remarks as string | null) ?? null,
      allocatedAmount: Number(doc.total_allocated_amount ?? 0),
      unallocatedAmount: Number(doc.unallocated_amount ?? 0),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      references: refs.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        referenceDoctype: String(r.reference_doctype ?? ""),
        referenceName: String(r.reference_name ?? ""),
        totalAmount: Number(r.total_amount ?? 0),
        outstandingAmount: Number(r.outstanding_amount ?? 0),
        allocatedAmount: Number(r.allocated_amount ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type PaymentEntryCreateInput = {
  paymentType: PaymentType;
  postingDate: string;
  company: string;
  partyType?: string;
  party?: string;
  paidFrom?: string;
  paidTo?: string;
  paidAmount: number;
  receivedAmount?: number;
  modeOfPayment?: string;
  referenceNo?: string;
  referenceDate?: string;
  remarks?: string;
};

export async function createPaymentEntry(input: PaymentEntryCreateInput): Promise<{ name: string }> {
  const doc: Record<string, unknown> = {
    doctype: "Payment Entry",
    payment_type: input.paymentType,
    posting_date: input.postingDate,
    company: input.company,
    paid_amount: Number(input.paidAmount),
    received_amount: Number(input.receivedAmount ?? input.paidAmount),
    mode_of_payment: input.modeOfPayment || undefined,
    reference_no: input.referenceNo || undefined,
    reference_date: input.referenceDate || undefined,
    remarks: input.remarks || undefined,
  };
  if (input.paymentType !== "Internal Transfer") {
    if (input.partyType) doc.party_type = input.partyType;
    if (input.party) doc.party = input.party;
  }
  if (input.paidFrom) doc.paid_from = input.paidFrom;
  if (input.paidTo) doc.paid_to = input.paidTo;

  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function submitPaymentEntry(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Payment Entry", name } },
  });
}

export async function cancelPaymentEntry(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Payment Entry", name },
  });
}

export async function listModesOfPayment(): Promise<Array<{ name: string; type: string }>> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Mode of Payment",
      fields: ["name", "type"],
      filters: [["enabled", "=", 1]],
      order_by: "name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({ name: String(r.name ?? ""), type: String(r.type ?? "") }));
}

export async function listParties(partyType: string, opts: { search?: string; limit?: number } = {}): Promise<Array<{ name: string; label: string }>> {
  const limit = Math.min(50, opts.limit ?? 20);
  const filters: [string, string, unknown][] = [];
  const nameField = partyType === "Employee" ? "employee_name" : partyType === "Customer" ? "customer_name" : partyType === "Supplier" ? "supplier_name" : "name";
  if (opts.search) filters.push([nameField, "like", `%${opts.search}%`]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: partyType,
      fields: ["name", nameField],
      filters,
      order_by: `${nameField} asc`,
      limit_page_length: limit,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    label: String(r[nameField] ?? r.name ?? ""),
  }));
}

// ── Accounts (used by Journal + Payment) ─────────────────────────

export async function listAccounts(company: string, opts: { search?: string; limit?: number } = {}): Promise<AccountOption[]> {
  const limit = Math.min(50, opts.limit ?? 20);
  // `disabled` isn't a queryable field on Account under Frappe v15's
  // get_list field-permission check — it 417s if we include it in the
  // filters. Users creating a new journal entry will still see disabled
  // accounts here; we sort that out at post-time.
  const filters: [string, string, unknown][] = [
    ["company", "=", company],
    ["is_group", "=", 0],
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

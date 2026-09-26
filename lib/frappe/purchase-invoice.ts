import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

/**
 * Server-side helpers for ERPNext Purchase Invoice — mirror of the
 * Sales Invoice helpers, with Supplier + expense_account instead of
 * Customer + income_account.
 */

export type PurchaseInvoiceRow = {
  name: string;
  supplier: string;
  supplierName: string | null;
  postingDate: string;
  dueDate: string | null;
  company: string;
  currency: string;
  grandTotal: number;
  outstandingAmount: number;
  status: string;
  docstatus: 0 | 1 | 2;
};

export type PurchaseInvoiceList = {
  rows: PurchaseInvoiceRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    draft: number;
    submitted: number;
    paid: number;
    overdue: number;
    outstandingTotal: number;
    grandTotalPosted: number;
  };
};

export type PurchaseInvoiceItem = {
  idx: number;
  itemCode: string;
  itemName: string;
  description: string | null;
  qty: number;
  rate: number;
  amount: number;
  uom: string | null;
  expenseAccount: string | null;
  costCenter: string | null;
};

export type PurchaseInvoiceTax = {
  idx: number;
  chargeType: string;
  accountHead: string;
  description: string;
  rate: number;
  taxAmount: number;
  total: number;
};

export type PurchaseInvoiceDetail = {
  name: string;
  supplier: string;
  supplierName: string | null;
  postingDate: string;
  dueDate: string | null;
  company: string;
  currency: string;
  conversionRate: number;
  netTotal: number;
  totalTaxes: number;
  grandTotal: number;
  outstandingAmount: number;
  paidAmount: number;
  status: string;
  docstatus: 0 | 1 | 2;
  billNo: string | null;
  billDate: string | null;
  remarks: string | null;
  items: PurchaseInvoiceItem[];
  taxes: PurchaseInvoiceTax[];
};

export async function listPurchaseInvoices(opts: {
  docstatus?: number;
  company?: string;
  supplier?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PurchaseInvoiceList> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 25));

  const filters: [string, string, unknown][] = [];
  if (opts.docstatus !== undefined) filters.push(["docstatus", "=", opts.docstatus]);
  if (opts.company) filters.push(["company", "=", opts.company]);
  if (opts.supplier) filters.push(["supplier", "=", opts.supplier]);
  if (opts.status) filters.push(["status", "=", opts.status]);

  const [rowsRaw, totalRaw, counts] = await Promise.all([
    frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Purchase Invoice",
        fields: [
          "name",
          "supplier",
          "supplier_name",
          "posting_date",
          "due_date",
          "company",
          "currency",
          "grand_total",
          "outstanding_amount",
          "status",
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
      args: { doctype: "Purchase Invoice", filters },
    }),
    fetchPurchaseInvoiceCounts(opts.company, opts.supplier),
  ]);

  const total = typeof totalRaw === "number" ? totalRaw : (totalRaw?.count ?? 0);
  const rows: PurchaseInvoiceRow[] = rowsRaw.map((r) => ({
    name: String(r.name ?? ""),
    supplier: String(r.supplier ?? ""),
    supplierName: (r.supplier_name as string | null) ?? null,
    postingDate: String(r.posting_date ?? ""),
    dueDate: (r.due_date as string | null) ?? null,
    company: String(r.company ?? ""),
    currency: String(r.currency ?? "USD"),
    grandTotal: Number(r.grand_total ?? 0),
    outstandingAmount: Number(r.outstanding_amount ?? 0),
    status: String(r.status ?? ""),
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
  }));

  return { rows, total, page, pageSize, counts };
}

async function fetchPurchaseInvoiceCounts(
  company: string | undefined,
  supplier: string | undefined,
): Promise<PurchaseInvoiceList["counts"]> {
  const base: [string, string, unknown][] = [];
  if (company) base.push(["company", "=", company]);
  if (supplier) base.push(["supplier", "=", supplier]);

  const [draft, submitted, paid, overdue, outstandingRows, grandTotalRows] = await Promise.all([
    countPI([...base, ["docstatus", "=", 0]]),
    countPI([...base, ["docstatus", "=", 1]]),
    countPI([...base, ["status", "=", "Paid"]]),
    countPI([...base, ["status", "=", "Overdue"]]),
    sumPI([...base, ["docstatus", "=", 1]], "outstanding_amount"),
    sumPI([...base, ["docstatus", "=", 1]], "grand_total"),
  ]);
  return {
    draft,
    submitted,
    paid,
    overdue,
    outstandingTotal: outstandingRows,
    grandTotalPosted: grandTotalRows,
  };
}

async function countPI(filters: [string, string, unknown][]): Promise<number> {
  const raw = await frappeCall<{ count?: number } | number>({
    method: "frappe.client.get_count",
    as: "user",
    args: { doctype: "Purchase Invoice", filters },
  });
  return typeof raw === "number" ? raw : (raw?.count ?? 0);
}

async function sumPI(
  filters: [string, string, unknown][],
  field: "outstanding_amount" | "grand_total",
): Promise<number> {
  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Purchase Invoice",
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

export async function getPurchaseInvoice(name: string): Promise<PurchaseInvoiceDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Purchase Invoice", name },
    });
    const items = (doc.items as Array<Record<string, unknown>>) ?? [];
    const taxes = (doc.taxes as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      supplier: String(doc.supplier ?? ""),
      supplierName: (doc.supplier_name as string | null) ?? null,
      postingDate: String(doc.posting_date ?? ""),
      dueDate: (doc.due_date as string | null) ?? null,
      company: String(doc.company ?? ""),
      currency: String(doc.currency ?? "USD"),
      conversionRate: Number(doc.conversion_rate ?? 1),
      netTotal: Number(doc.net_total ?? 0),
      totalTaxes: Number(doc.total_taxes_and_charges ?? 0),
      grandTotal: Number(doc.grand_total ?? 0),
      outstandingAmount: Number(doc.outstanding_amount ?? 0),
      paidAmount: Number(doc.paid_amount ?? 0),
      status: String(doc.status ?? ""),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      billNo: (doc.bill_no as string | null) ?? null,
      billDate: (doc.bill_date as string | null) ?? null,
      remarks: (doc.remarks as string | null) ?? null,
      items: items.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        itemCode: String(r.item_code ?? ""),
        itemName: String(r.item_name ?? r.item_code ?? ""),
        description: (r.description as string | null) ?? null,
        qty: Number(r.qty ?? 0),
        rate: Number(r.rate ?? 0),
        amount: Number(r.amount ?? 0),
        uom: (r.uom as string | null) ?? null,
        expenseAccount: (r.expense_account as string | null) ?? null,
        costCenter: (r.cost_center as string | null) ?? null,
      })),
      taxes: taxes.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        chargeType: String(r.charge_type ?? ""),
        accountHead: String(r.account_head ?? ""),
        description: String(r.description ?? ""),
        rate: Number(r.rate ?? 0),
        taxAmount: Number(r.tax_amount ?? 0),
        total: Number(r.total ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type PurchaseInvoiceCreateInput = {
  supplier: string;
  postingDate: string;
  dueDate?: string;
  company: string;
  currency?: string;
  billNo?: string;
  billDate?: string;
  remarks?: string;
  items: Array<{
    itemCode: string;
    qty: number;
    rate: number;
    uom?: string;
    description?: string;
    expenseAccount?: string;
    costCenter?: string;
  }>;
};

export async function createPurchaseInvoice(input: PurchaseInvoiceCreateInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Purchase Invoice",
    supplier: input.supplier,
    posting_date: input.postingDate,
    due_date: input.dueDate || undefined,
    company: input.company,
    currency: input.currency || undefined,
    bill_no: input.billNo || undefined,
    bill_date: input.billDate || undefined,
    remarks: input.remarks || undefined,
    items: input.items.map((it) => ({
      item_code: it.itemCode,
      qty: Number(it.qty),
      rate: Number(it.rate),
      uom: it.uom || undefined,
      description: it.description || undefined,
      expense_account: it.expenseAccount || undefined,
      cost_center: it.costCenter || undefined,
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

export async function submitPurchaseInvoice(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Purchase Invoice", name } },
  });
}

export async function cancelPurchaseInvoice(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Purchase Invoice", name },
  });
}

export async function listSuppliers(opts: { search?: string; limit?: number } = {}): Promise<Array<{ name: string; label: string }>> {
  const limit = Math.min(50, opts.limit ?? 30);
  // `disabled` isn't in Supplier's queryable field allowlist under Frappe
  // v15 — filtering on it 417s. Every supplier is returned; disabled ones
  // still work for opening invoices.
  const filters: [string, string, unknown][] = [];
  if (opts.search) filters.push(["supplier_name", "like", `%${opts.search}%`]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Supplier",
      fields: ["name", "supplier_name"],
      filters,
      order_by: "supplier_name asc",
      limit_page_length: limit,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    label: String(r.supplier_name ?? r.name ?? ""),
  }));
}

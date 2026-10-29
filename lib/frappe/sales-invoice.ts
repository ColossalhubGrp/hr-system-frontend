import "server-only";
import { FrappeRequestError, frappeCall } from "./client";
import { submitDoc } from "./submit-doc";

/**
 * Server-side helpers for ERPNext Sales Invoice.
 *
 * Sales Invoice is a big DocType — we surface the fields Colossal HR
 * users actually see: customer, posting/due dates, items grid, totals
 * and payment status. Advanced sub-tables (payment schedule, packed
 * items, batch numbers) fall through to the underlying doc via
 * frappe.client.get; the read APIs expose them if a caller needs them.
 */

export type SalesInvoiceRow = {
  name: string;
  customer: string;
  customerName: string | null;
  postingDate: string;
  dueDate: string | null;
  company: string;
  currency: string;
  grandTotal: number;
  outstandingAmount: number;
  status: string;
  docstatus: 0 | 1 | 2;
};

export type SalesInvoiceList = {
  rows: SalesInvoiceRow[];
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

export type SalesInvoiceItem = {
  idx: number;
  itemCode: string;
  itemName: string;
  description: string | null;
  qty: number;
  rate: number;
  amount: number;
  uom: string | null;
  incomeAccount: string | null;
  costCenter: string | null;
};

export type SalesInvoiceTax = {
  idx: number;
  chargeType: string;
  accountHead: string;
  description: string;
  rate: number;
  taxAmount: number;
  total: number;
};

export type SalesInvoiceDetail = {
  name: string;
  customer: string;
  customerName: string | null;
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
  poNo: string | null;
  poDate: string | null;
  remarks: string | null;
  taxesAndCharges: string | null;
  items: SalesInvoiceItem[];
  taxes: SalesInvoiceTax[];
  /** ZIMRA fiscalisation outcome — empty when fiscalisation is off. */
  fiscalStatus: string | null;
  fiscalReceiptGlobalNo: number | null;
  fiscalDayNo: number | null;
  fiscalQrData: string | null;
  fiscalCnReceiptGlobalNo: number | null;
  fiscalError: string | null;
};

export async function listSalesInvoices(opts: {
  docstatus?: number;
  company?: string;
  customer?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<SalesInvoiceList> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 25));

  const filters: [string, string, unknown][] = [];
  if (opts.docstatus !== undefined) filters.push(["docstatus", "=", opts.docstatus]);
  if (opts.company) filters.push(["company", "=", opts.company]);
  if (opts.customer) filters.push(["customer", "=", opts.customer]);
  if (opts.status) filters.push(["status", "=", opts.status]);

  const [rowsRaw, totalRaw, counts] = await Promise.all([
    frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Colossal Sales Invoice",
        fields: [
          "name",
          "customer",
          "customer_name",
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
      args: { doctype: "Colossal Sales Invoice", filters },
    }),
    fetchSalesInvoiceCounts(opts.company, opts.customer),
  ]);

  const total = typeof totalRaw === "number" ? totalRaw : (totalRaw?.count ?? 0);
  const rows: SalesInvoiceRow[] = rowsRaw.map((r) => ({
    name: String(r.name ?? ""),
    customer: String(r.customer ?? ""),
    customerName: (r.customer_name as string | null) ?? null,
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

async function fetchSalesInvoiceCounts(
  company: string | undefined,
  customer: string | undefined,
): Promise<SalesInvoiceList["counts"]> {
  const base: [string, string, unknown][] = [];
  if (company) base.push(["company", "=", company]);
  if (customer) base.push(["customer", "=", customer]);

  const [draft, submitted, paid, overdue, outstandingRows, grandTotalRows] = await Promise.all([
    countSI([...base, ["docstatus", "=", 0]]),
    countSI([...base, ["docstatus", "=", 1]]),
    countSI([...base, ["status", "=", "Paid"]]),
    countSI([...base, ["status", "=", "Overdue"]]),
    sumSI([...base, ["docstatus", "=", 1]], "outstanding_amount"),
    sumSI([...base, ["docstatus", "=", 1]], "grand_total"),
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

async function countSI(filters: [string, string, unknown][]): Promise<number> {
  const raw = await frappeCall<{ count?: number } | number>({
    method: "frappe.client.get_count",
    as: "user",
    args: { doctype: "Colossal Sales Invoice", filters },
  });
  return typeof raw === "number" ? raw : (raw?.count ?? 0);
}

async function sumSI(
  filters: [string, string, unknown][],
  field: "outstanding_amount" | "grand_total",
): Promise<number> {
  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Colossal Sales Invoice",
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

export async function getSalesInvoice(name: string): Promise<SalesInvoiceDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Colossal Sales Invoice", name },
    });
    const items = (doc.items as Array<Record<string, unknown>>) ?? [];
    const taxes = (doc.taxes as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      customer: String(doc.customer ?? ""),
      customerName: (doc.customer_name as string | null) ?? null,
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
      poNo: (doc.po_no as string | null) ?? null,
      poDate: (doc.po_date as string | null) ?? null,
      remarks: (doc.remarks as string | null) ?? null,
      taxesAndCharges: (doc.taxes_and_charges as string | null) ?? null,
      items: items.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        itemCode: String(r.item_code ?? ""),
        itemName: String(r.item_name ?? r.item_code ?? ""),
        description: (r.description as string | null) ?? null,
        qty: Number(r.qty ?? 0),
        rate: Number(r.rate ?? 0),
        amount: Number(r.amount ?? 0),
        uom: (r.uom as string | null) ?? null,
        incomeAccount: (r.income_account as string | null) ?? null,
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
      fiscalStatus: (doc.fiscal_status as string | null) || null,
      fiscalReceiptGlobalNo: doc.fiscal_receipt_global_no ? Number(doc.fiscal_receipt_global_no) : null,
      fiscalDayNo: doc.fiscal_day_no ? Number(doc.fiscal_day_no) : null,
      fiscalQrData: (doc.fiscal_qr_data as string | null) || null,
      fiscalCnReceiptGlobalNo: doc.fiscal_cn_receipt_global_no
        ? Number(doc.fiscal_cn_receipt_global_no)
        : null,
      fiscalError: (doc.fiscal_error as string | null) || null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type SalesInvoiceCreateInput = {
  customer: string;
  postingDate: string;
  dueDate?: string;
  company: string;
  currency?: string;
  poNo?: string;
  poDate?: string;
  remarks?: string;
  /** Link to Colossal Sales Taxes and Charges Template. When set, the
   *  Frappe controller copies the template's rows into the invoice's
   *  `taxes` child table and recomputes grand_total = net + taxes. */
  taxesAndCharges?: string;
  items: Array<{
    itemCode: string;
    qty: number;
    rate: number;
    uom?: string;
    description?: string;
    incomeAccount?: string;
    costCenter?: string;
  }>;
};

/** Fetch a tax template's rows and shape them as invoice `taxes` child
 *  rows. The Desk UI copies these client-side when you pick a template;
 *  REST inserts get no such help, so without this the invoice stores
 *  the template name but computes zero tax. */
export async function fetchTemplateTaxRows(
  templateDoctype: string,
  templateName: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    const tpl = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: templateDoctype, name: templateName },
    });
    const rows = (tpl.taxes as Array<Record<string, unknown>>) ?? [];
    return rows.map((r) => ({
      charge_type: r.charge_type,
      account_head: r.account_head,
      description: r.description || r.account_head,
      rate: Number(r.rate ?? 0),
      row_id: r.row_id || undefined,
      cost_center: r.cost_center || undefined,
      included_in_print_rate: Number(r.included_in_print_rate ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function createSalesInvoice(input: SalesInvoiceCreateInput): Promise<{ name: string }> {
  const taxRows = input.taxesAndCharges
    ? await fetchTemplateTaxRows("Colossal Sales Taxes and Charges Template", input.taxesAndCharges)
    : [];
  const doc = {
    doctype: "Colossal Sales Invoice",
    customer: input.customer,
    posting_date: input.postingDate,
    due_date: input.dueDate || undefined,
    company: input.company,
    currency: input.currency || undefined,
    po_no: input.poNo || undefined,
    po_date: input.poDate || undefined,
    remarks: input.remarks || undefined,
    taxes_and_charges: input.taxesAndCharges || undefined,
    taxes: taxRows.length > 0 ? taxRows : undefined,
    items: input.items.map((it) => ({
      item_code: it.itemCode,
      qty: Number(it.qty),
      rate: Number(it.rate),
      uom: it.uom || undefined,
      description: it.description || undefined,
      income_account: it.incomeAccount || undefined,
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

export async function submitSalesInvoice(name: string): Promise<void> {
  await submitDoc("Colossal Sales Invoice", name);
}

/** Draft-only overwrite — same pattern as updateJournalEntry. */
export async function updateSalesInvoice(
  name: string,
  input: SalesInvoiceCreateInput,
): Promise<void> {
  const existing = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Colossal Sales Invoice", name },
  });
  if (Number(existing.docstatus ?? 0) !== 0) {
    throw new Error("This invoice is no longer a draft, so it can't be edited. Reload the page.");
  }

  // Re-derive tax rows from the picked template so changing (or
  // clearing) the template on edit actually changes the computed tax.
  const taxRows = input.taxesAndCharges
    ? await fetchTemplateTaxRows("Colossal Sales Taxes and Charges Template", input.taxesAndCharges)
    : [];

  const doc = {
    ...existing,
    doctype: "Colossal Sales Invoice",
    customer: input.customer,
    posting_date: input.postingDate,
    due_date: input.dueDate || null,
    company: input.company,
    currency: input.currency || existing.currency,
    po_no: input.poNo || null,
    po_date: input.poDate || null,
    remarks: input.remarks || null,
    taxes_and_charges: input.taxesAndCharges || null,
    taxes: taxRows,
    items: input.items.map((it) => ({
      item_code: it.itemCode,
      qty: Number(it.qty),
      rate: Number(it.rate),
      uom: it.uom || null,
      description: it.description || null,
      income_account: it.incomeAccount || null,
      cost_center: it.costCenter || null,
    })),
  };

  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: { doc },
  });
}

export async function cancelSalesInvoice(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Colossal Sales Invoice", name },
  });
}

export async function listCustomers(opts: { search?: string; limit?: number } = {}): Promise<Array<{ name: string; label: string }>> {
  const limit = Math.min(50, opts.limit ?? 30);
  // `disabled` isn't in Customer's queryable field allowlist under Frappe
  // v15 — filtering on it 417s. Every customer is returned.
  const filters: [string, string, unknown][] = [];
  if (opts.search) filters.push(["customer_name", "like", `%${opts.search}%`]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Customer",
      fields: ["name", "customer_name"],
      filters,
      order_by: "customer_name asc",
      limit_page_length: limit,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    label: String(r.customer_name ?? r.name ?? ""),
  }));
}

export async function listItems(opts: { search?: string; limit?: number } = {}): Promise<Array<{ code: string; name: string; uom: string; standardRate: number }>> {
  const limit = Math.min(50, opts.limit ?? 30);
  // `disabled` isn't in Item's queryable field allowlist under Frappe v15
  // — filtering on it 417s. Every item is returned.
  const filters: [string, string, unknown][] = [];
  if (opts.search) filters.push(["item_name", "like", `%${opts.search}%`]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Item",
      fields: ["name", "item_name", "stock_uom", "standard_rate"],
      filters,
      order_by: "item_name asc",
      limit_page_length: limit,
    },
  });
  return rows.map((r) => ({
    code: String(r.name ?? ""),
    name: String(r.item_name ?? r.name ?? ""),
    uom: String(r.stock_uom ?? "Nos"),
    standardRate: Number(r.standard_rate ?? 0),
  }));
}

/** Re-send a Failed invoice to ZIMRA via the backend's guarded retry. */
export async function retryFiscalisation(name: string): Promise<{
  fiscal_status: string | null;
  fiscal_error: string | null;
}> {
  return await frappeCall({
    method: "colossal_accounting.fiscalisation.retry_fiscalisation",
    as: "user",
    verb: "POST",
    args: { name },
  });
}

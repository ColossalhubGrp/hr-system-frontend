import "server-only";
import { FrappeRequestError, frappeCall } from "../client";
export { CHARGE_TYPES } from "./sales-template-constants";

/**
 * ERPNext "Colossal Sales Taxes and Charges Template" — the reusable tax block
 * applied to Sales Invoices, Quotes and Sales Orders.
 */

export type SalesTaxTemplate = {
  name: string;
  title: string;
  company: string;
  isDefault: boolean;
  disabled: boolean;
};

export type SalesTaxLine = {
  idx: number;
  chargeType: string;
  accountHead: string;
  description: string;
  rate: number;
  costCenter: string | null;
  includedInPrintRate: boolean;
};

export type SalesTaxTemplateDetail = SalesTaxTemplate & { taxes: SalesTaxLine[] };

export async function listSalesTaxTemplates(): Promise<SalesTaxTemplate[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Colossal Sales Taxes and Charges Template",
      // `disabled` not queryable via get_list under Frappe v15 field
      // permissions. Only fetched on the detail form.
      fields: ["name", "title", "company", "is_default"],
      order_by: "title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    title: String(r.title ?? r.name ?? ""),
    company: String(r.company ?? ""),
    isDefault: Number(r.is_default ?? 0) === 1,
    disabled: false, // see fields comment above
  }));
}

export async function getSalesTaxTemplate(name: string): Promise<SalesTaxTemplateDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Colossal Sales Taxes and Charges Template", name },
    });
    const taxes = (doc.taxes as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      title: String(doc.title ?? doc.name ?? ""),
      company: String(doc.company ?? ""),
      isDefault: Number(doc.is_default ?? 0) === 1,
      disabled: Number(doc.disabled ?? 0) === 1,
      taxes: taxes.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        chargeType: String(r.charge_type ?? ""),
        accountHead: String(r.account_head ?? ""),
        description: String(r.description ?? ""),
        rate: Number(r.rate ?? 0),
        costCenter: (r.cost_center as string | null) ?? null,
        includedInPrintRate: Number(r.included_in_print_rate ?? 0) === 1,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type SalesTaxTemplateInput = {
  title: string;
  company: string;
  isDefault: boolean;
  disabled: boolean;
  taxes: Array<{ chargeType: string; accountHead: string; description: string; rate: number; costCenter?: string; includedInPrintRate: boolean }>;
};

export async function createSalesTaxTemplate(input: SalesTaxTemplateInput): Promise<{ name: string }> {
  await assertAccountsInCompany(input.taxes, input.company);
  const doc = {
    doctype: "Colossal Sales Taxes and Charges Template",
    title: input.title,
    company: input.company,
    is_default: input.isDefault ? 1 : 0,
    disabled: input.disabled ? 1 : 0,
    taxes: input.taxes.map((t) => ({
      charge_type: t.chargeType,
      account_head: t.accountHead,
      description: t.description,
      rate: t.rate,
      cost_center: t.costCenter || undefined,
      included_in_print_rate: t.includedInPrintRate ? 1 : 0,
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

export async function updateSalesTaxTemplate(name: string, input: SalesTaxTemplateInput): Promise<void> {
  // Catch cross-company rows BEFORE calling save, so the user sees a
  // specific "Row 2: 5500 - Insurance - CH belongs to <other company>"
  // instead of a generic 417 from the Frappe validator.
  await assertAccountsInCompany(input.taxes, input.company);
  // Frappe v15's typed_validator rejects a partial `frappe.client.save`
  // payload with 417. Fetch the full doc, spread, overwrite the editable
  // fields and the whole `taxes` child table, then save it back.
  const existing = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Colossal Sales Taxes and Charges Template", name },
  });
  const doc = {
    ...existing,
    doctype: "Colossal Sales Taxes and Charges Template",
    name,
    title: input.title,
    company: input.company,
    is_default: input.isDefault ? 1 : 0,
    disabled: input.disabled ? 1 : 0,
    taxes: input.taxes.map((t) => ({
      charge_type: t.chargeType,
      account_head: t.accountHead,
      description: t.description,
      rate: t.rate,
      cost_center: t.costCenter || undefined,
      included_in_print_rate: t.includedInPrintRate ? 1 : 0,
    })),
  };
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: { doc },
  });
}

/** Resolve each tax row's account company and raise a clear error if any
 *  row references an account from a different company. Prevents the
 *  Frappe server validator from firing with its generic 417 message. */
async function assertAccountsInCompany(
  rows: Array<{ accountHead: string }>,
  company: string,
): Promise<void> {
  const unique = Array.from(new Set(rows.map((r) => r.accountHead).filter(Boolean)));
  if (unique.length === 0) return;
  const companies = await Promise.all(
    unique.map(async (acc) => {
      try {
        const doc = await frappeCall<{ company?: string }>({
          method: "frappe.client.get_value",
          as: "user",
          args: {
            doctype: "Colossal Account",
            filters: { name: acc },
            fieldname: ["company"],
          },
        });
        return { acc, company: String(doc?.company ?? "") };
      } catch {
        return { acc, company: "" };
      }
    }),
  );
  const byAccount = new Map(companies.map((c) => [c.acc, c.company]));
  const bad: string[] = [];
  rows.forEach((r, i) => {
    const owner = byAccount.get(r.accountHead) ?? "";
    if (r.accountHead && owner && owner !== company) {
      bad.push(`Row ${i + 1}: "${r.accountHead}" is for company "${owner}", not "${company}". Pick an account from "${company}" instead.`);
    } else if (r.accountHead && !owner) {
      bad.push(`Row ${i + 1}: "${r.accountHead}" is no longer available. Pick another account.`);
    }
  });
  if (bad.length > 0) {
    throw new Error(bad.join(" "));
  }
}

export async function deleteSalesTaxTemplate(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Colossal Sales Taxes and Charges Template", name },
  });
}

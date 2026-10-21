"use server";

import { frappeCall } from "./client";

export type GlobalSearchHit = {
  doctype: string;
  group: string;
  name: string;
  label: string;
  href: string;
};

type Scope = {
  doctype: string;
  display: string;
  labelField: string;
  hrefTemplate: (name: string) => string;
};

const SCOPES: Scope[] = [
  { doctype: "Employee",                 display: "Employees",         labelField: "employee_name", hrefTemplate: (n) => `/employee/${encodeURIComponent(n)}` },
  { doctype: "Customer",                 display: "Customers",         labelField: "customer_name", hrefTemplate: (n) => `/sales/customers/${encodeURIComponent(n)}` },
  { doctype: "Supplier",                 display: "Suppliers",         labelField: "supplier_name", hrefTemplate: (n) => `/buying/suppliers/${encodeURIComponent(n)}` },
  { doctype: "Item",                     display: "Items",             labelField: "item_name",     hrefTemplate: (n) => `/accounting/items/${encodeURIComponent(n)}` },
  { doctype: "Colossal Sales Invoice",   display: "Sales invoices",    labelField: "customer_name", hrefTemplate: (n) => `/accounting/sales-invoices/${encodeURIComponent(n)}` },
  { doctype: "Colossal Purchase Invoice",display: "Purchase invoices", labelField: "supplier_name", hrefTemplate: (n) => `/accounting/purchase-invoices/${encodeURIComponent(n)}` },
  { doctype: "Colossal Account",         display: "Accounts",          labelField: "account_name",  hrefTemplate: (n) => `/accounting/chart-of-accounts/${encodeURIComponent(n)}` },
];

/**
 * Live-suggest fan-out for the topbar autocomplete. Returns up to
 * `perScope` hits from each entity type for a quick dropdown.
 * Scopes that fail (permission, doctype missing) silently drop out.
 */
export async function globalSearchSuggest(
  q: string,
  perScope: number = 4,
): Promise<GlobalSearchHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const needle = `%${query}%`;

  const perScopeHits = await Promise.all(
    SCOPES.map(async (s): Promise<GlobalSearchHit[]> => {
      try {
        const rows = await frappeCall<Array<Record<string, unknown>>>({
          method: "frappe.client.get_list",
          as: "user",
          args: {
            doctype: s.doctype,
            fields: ["name", s.labelField],
            or_filters: [
              ["name", "like", needle],
              [s.labelField, "like", needle],
            ],
            limit_page_length: perScope,
            order_by: "modified desc",
          },
        });
        return (rows ?? []).map((r) => ({
          doctype: s.doctype,
          group: s.display,
          name: String(r.name ?? ""),
          label: String(r[s.labelField] ?? r.name ?? ""),
          href: s.hrefTemplate(String(r.name ?? "")),
        }));
      } catch {
        return [];
      }
    }),
  );
  return perScopeHits.flat();
}

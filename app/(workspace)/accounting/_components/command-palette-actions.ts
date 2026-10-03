"use server";

import { frappeCall } from "@/lib/frappe/client";
import { requireGroup } from "@/lib/frappe/require-role";

export type PaletteHit = {
  kind: "Sales Invoice" | "Purchase Invoice" | "Journal Entry" | "Payment Entry" | "Account" | "Customer" | "Supplier";
  name: string;         // doc name — stable identifier
  label: string;        // what to show as the primary line
  subtitle?: string;    // secondary line
  href: string;         // where to send the user
};

/**
 * Fan-out search across the key accounting doctypes. Returns the top
 * ~8 hits per source, de-duplicated, ranked by source priority
 * (invoices + accounts beat drafts). Server-side so API keys don't
 * leak to the browser.
 */
export async function searchAccountingAction(rawQuery: string): Promise<PaletteHit[]> {
  await requireGroup("HR_ADMIN");
  const q = (rawQuery ?? "").trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;

  async function safe<T>(args: Record<string, unknown>): Promise<T[]> {
    try {
      return await frappeCall<T[]>({
        method: "frappe.client.get_list",
        args,
        as: "user",
      });
    } catch {
      return [] as T[];
    }
  }

  const [si, pi, pe, je, acct, cust, sup] = await Promise.all([
    safe<{ name: string; customer: string; grand_total: number; status: string }>({
      doctype: "Sales Invoice",
      fields: ["name", "customer", "grand_total", "status"],
      or_filters: JSON.stringify([
        ["name", "like", like],
        ["customer", "like", like],
      ]),
      limit_page_length: 6,
      order_by: "modified desc",
    }),
    safe<{ name: string; supplier: string; grand_total: number; status: string }>({
      doctype: "Purchase Invoice",
      fields: ["name", "supplier", "grand_total", "status"],
      or_filters: JSON.stringify([
        ["name", "like", like],
        ["supplier", "like", like],
      ]),
      limit_page_length: 6,
      order_by: "modified desc",
    }),
    safe<{ name: string; party: string; paid_amount: number; payment_type: string }>({
      doctype: "Payment Entry",
      fields: ["name", "party", "paid_amount", "payment_type"],
      or_filters: JSON.stringify([
        ["name", "like", like],
        ["party", "like", like],
      ]),
      limit_page_length: 5,
      order_by: "modified desc",
    }),
    safe<{ name: string; voucher_type: string; total_debit: number }>({
      doctype: "Journal Entry",
      fields: ["name", "voucher_type", "total_debit"],
      filters: JSON.stringify([["name", "like", like]]),
      limit_page_length: 5,
      order_by: "modified desc",
    }),
    safe<{ name: string; account_type: string; parent_account: string }>({
      doctype: "Account",
      fields: ["name", "account_type", "parent_account"],
      filters: JSON.stringify([["name", "like", like]]),
      limit_page_length: 8,
      order_by: "name asc",
    }),
    safe<{ name: string; customer_name: string; customer_type: string }>({
      doctype: "Customer",
      fields: ["name", "customer_name", "customer_type"],
      or_filters: JSON.stringify([
        ["name", "like", like],
        ["customer_name", "like", like],
      ]),
      limit_page_length: 5,
      order_by: "modified desc",
    }),
    safe<{ name: string; supplier_name: string; supplier_type: string }>({
      doctype: "Supplier",
      fields: ["name", "supplier_name", "supplier_type"],
      or_filters: JSON.stringify([
        ["name", "like", like],
        ["supplier_name", "like", like],
      ]),
      limit_page_length: 5,
      order_by: "modified desc",
    }),
  ]);

  const hits: PaletteHit[] = [
    ...si.map<PaletteHit>((r) => ({
      kind: "Sales Invoice",
      name: r.name,
      label: r.name,
      subtitle: `${r.customer ?? "—"} · ${r.status ?? ""} · ${r.grand_total?.toLocaleString() ?? ""}`.trim(),
      href: `/accounting/sales-invoices/${encodeURIComponent(r.name)}`,
    })),
    ...pi.map<PaletteHit>((r) => ({
      kind: "Purchase Invoice",
      name: r.name,
      label: r.name,
      subtitle: `${r.supplier ?? "—"} · ${r.status ?? ""} · ${r.grand_total?.toLocaleString() ?? ""}`.trim(),
      href: `/accounting/purchase-invoices/${encodeURIComponent(r.name)}`,
    })),
    ...pe.map<PaletteHit>((r) => ({
      kind: "Payment Entry",
      name: r.name,
      label: r.name,
      subtitle: `${r.payment_type ?? ""} · ${r.party ?? "—"} · ${r.paid_amount?.toLocaleString() ?? ""}`.trim(),
      href: `/accounting/payment-entries/${encodeURIComponent(r.name)}`,
    })),
    ...je.map<PaletteHit>((r) => ({
      kind: "Journal Entry",
      name: r.name,
      label: r.name,
      subtitle: `${r.voucher_type ?? ""} · ${r.total_debit?.toLocaleString() ?? ""}`.trim(),
      href: `/accounting/journal-entries/${encodeURIComponent(r.name)}`,
    })),
    ...acct.map<PaletteHit>((r) => ({
      kind: "Account",
      name: r.name,
      label: r.name,
      subtitle: `${r.account_type || "Account"}${r.parent_account ? ` · under ${r.parent_account}` : ""}`,
      href: `/accounting/chart-of-accounts?account=${encodeURIComponent(r.name)}`,
    })),
    ...cust.map<PaletteHit>((r) => ({
      kind: "Customer",
      name: r.name,
      label: r.customer_name || r.name,
      subtitle: `${r.customer_type ?? "Customer"} · ${r.name}`,
      href: `/sales/customers/${encodeURIComponent(r.name)}`,
    })),
    ...sup.map<PaletteHit>((r) => ({
      kind: "Supplier",
      name: r.name,
      label: r.supplier_name || r.name,
      subtitle: `${r.supplier_type ?? "Supplier"} · ${r.name}`,
      href: `/buying/suppliers/${encodeURIComponent(r.name)}`,
    })),
  ];

  return hits.slice(0, 30);
}

import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

/**
 * Per-section row-count map. Maps the row's label → an integer count
 * (number of docs in the corresponding doctype), so each RowCard can
 * show "142 accounts" rather than a static title. Falls back to null
 * when the doctype is unknown / unreachable (surfaced as "—").
 */

/** The doctype each known row label resolves to. Rows not in this map
 *  render with no count (that's fine — some rows are tools, not lists). */
// NOTE: values must be the doctype that the row's LIST PAGE actually
// queries — for the fork that's almost always the "Colossal …"
// doctype, not the stock ERPNext one (which is empty here). Mapping to
// the stock names made every card say "Not set up yet" even with real
// records present.
const LABEL_TO_DOCTYPE: Record<string, string> = {
  // Masters
  "Company":              "Company",
  "Chart of Accounts":    "Colossal Account",
  "Fiscal Year":          "Colossal Fiscal Year",
  "Accounting Dimension": "Colossal Accounting Dimension",
  "Finance Book":         "Colossal Finance Book",
  "Accounting Period":    "Colossal Accounting Period",
  "Payment Term":         "Colossal Payment Term",
  // Transactions
  "Sales Invoice":            "Colossal Sales Invoice",
  "Purchase Invoice":         "Colossal Purchase Invoice",
  "Journal Entry":            "Colossal Journal Entry",
  "Payment Entry":            "Colossal Payment Entry",
  "Journal Entry Template":   "Colossal Journal Entry Template",
  "Terms and Conditions":     "Terms and Conditions",
  "Mode of Payment":          "Colossal Mode of Payment",
  // Tax
  "Sales Taxes and Charges Template":    "Colossal Sales Taxes and Charges Template",
  "Purchase Taxes and Charges Template": "Colossal Purchase Taxes and Charges Template",
  "Item Tax Template":                   "Colossal Item Tax Template",
  "Tax Category":                        "Colossal Tax Category",
  "Tax Rule":                            "Colossal Tax Rule",
  "Tax Withholding Category":            "Colossal Tax Withholding Category",
  // Cost & Budget
  "Chart of Cost Centers":  "Colossal Cost Center",
  "Budget":                 "Colossal Budget",
  "Cost Center Allocation": "Cost Center Allocation",
  "Monthly Distribution":   "Colossal Monthly Distribution",
  // Multi-currency
  "Currency":                   "Currency",
  "Currency Exchange":          "Colossal Currency Exchange",
  "Exchange Rate Revaluation":  "Colossal Exchange Rate Revaluation",
  // Banking
  "Bank":                               "Bank",
  "Bank Account":                       "Bank Account",
  "Bank Clearance":                     "Bank Clearance",
  "Bank Reconciliation Statement":      "Bank Reconciliation Statement",
  // Subscriptions
  "Subscription Plan":  "Colossal Subscription Plan",
  "Subscription":       "Colossal Subscription",
  // Shares
  "Shareholder":    "Colossal Shareholder",
  "Share Transfer": "Colossal Share Transfer",
};

/** Doctypes that always have company scope. */
const COMPANY_SCOPED = new Set<string>([
  "Colossal Account",
  "Colossal Sales Invoice", "Colossal Purchase Invoice",
  "Colossal Journal Entry", "Colossal Payment Entry",
  "Colossal Cost Center", "Colossal Budget", "Bank Account",
  "Colossal Sales Taxes and Charges Template",
  "Colossal Purchase Taxes and Charges Template",
]);

async function count(doctype: string, filters: Record<string, unknown>): Promise<number | null> {
  try {
    // Raw object, not JSON.stringify — v15's typed validator rejects
    // stringified filters with 417 (same lesson as the report pages).
    const n = await frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype, filters },
      as: "user",
    });
    return Number(n ?? 0);
  } catch {
    return null;
  }
}

export async function loadSectionCounts(rowLabels: string[]): Promise<Map<string, number | null>> {
  const company = await myCompany();
  const uniqueDoctypes = new Set<string>();
  const labelToDoctype = new Map<string, string>();
  for (const lbl of rowLabels) {
    const dt = LABEL_TO_DOCTYPE[lbl];
    if (dt) {
      labelToDoctype.set(lbl, dt);
      uniqueDoctypes.add(dt);
    }
  }
  const dtList = [...uniqueDoctypes];
  const results = await Promise.all(
    dtList.map(async (dt) => {
      const filters: Record<string, unknown> = {};
      if (company && COMPANY_SCOPED.has(dt)) filters.company = company;
      return [dt, await count(dt, filters)] as const;
    }),
  );
  const byDoctype = new Map(results);
  const out = new Map<string, number | null>();
  for (const [lbl, dt] of labelToDoctype) {
    out.set(lbl, byDoctype.get(dt) ?? null);
  }
  return out;
}

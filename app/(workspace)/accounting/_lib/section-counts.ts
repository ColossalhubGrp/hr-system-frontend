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
const LABEL_TO_DOCTYPE: Record<string, string> = {
  // Masters
  "Company":              "Company",
  "Chart of Accounts":    "Account",
  "Fiscal Year":          "Fiscal Year",
  "Accounting Dimension": "Accounting Dimension",
  "Finance Book":         "Finance Book",
  "Accounting Period":    "Accounting Period",
  "Payment Term":         "Payment Term",
  // Transactions
  "Sales Invoice":            "Sales Invoice",
  "Purchase Invoice":         "Purchase Invoice",
  "Journal Entry":            "Journal Entry",
  "Payment Entry":            "Payment Entry",
  "Journal Entry Template":   "Journal Entry Template",
  "Terms and Conditions":     "Terms and Conditions",
  "Mode of Payment":          "Mode of Payment",
  // Tax
  "Sales Taxes and Charges Template":    "Sales Taxes and Charges Template",
  "Purchase Taxes and Charges Template": "Purchase Taxes and Charges Template",
  "Item Tax Template":                   "Item Tax Template",
  "Tax Category":                        "Tax Category",
  "Tax Rule":                            "Tax Rule",
  "Tax Withholding Category":            "Tax Withholding Category",
  // Cost & Budget
  "Chart of Cost Centers":  "Cost Center",
  "Budget":                 "Budget",
  "Cost Center Allocation": "Cost Center Allocation",
  "Monthly Distribution":   "Monthly Distribution",
  // Multi-currency
  "Currency":                   "Currency",
  "Currency Exchange":          "Currency Exchange",
  "Exchange Rate Revaluation":  "Exchange Rate Revaluation",
  // Banking
  "Bank":                               "Bank",
  "Bank Account":                       "Bank Account",
  "Bank Clearance":                     "Bank Clearance",
  "Bank Reconciliation Statement":      "Bank Reconciliation Statement",
  // Subscriptions
  "Subscription Plan":  "Subscription Plan",
  "Subscription":       "Subscription",
  // Shares
  "Shareholder":    "Shareholder",
  "Share Transfer": "Share Transfer",
};

/** Doctypes that always have company scope. */
const COMPANY_SCOPED = new Set<string>([
  "Account", "Fiscal Year", "Finance Book", "Accounting Period",
  "Sales Invoice", "Purchase Invoice", "Journal Entry", "Payment Entry",
  "Cost Center", "Budget", "Bank Account",
  "Sales Taxes and Charges Template", "Purchase Taxes and Charges Template",
]);

async function count(doctype: string, filters: Record<string, unknown>): Promise<number | null> {
  try {
    const n = await frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype, filters: JSON.stringify(filters) },
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

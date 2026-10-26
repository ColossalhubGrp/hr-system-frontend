import "server-only";
import { frappeCall } from "../client";
import { getCompanyMaster } from "../masters/company";

/**
 * "Can this tenant post an accounting transaction yet?"
 *
 * Each item names one defaulted field the Frappe/ERPNext controllers
 * will refuse to proceed without, with a direct link to the exact page
 * where the user resolves it. Driving every blocker through this
 * single list keeps the setup page, the SetupGate guard, and any
 * future dashboard warnings in sync — one source of truth, no drift.
 */

export type ReadinessItem = {
  key: string;
  label: string;
  /** One-sentence rationale, written for a non-technical bookkeeper. */
  hint: string;
  /** Which page the user fixes it on. */
  href: string;
  done: boolean;
};

export type ReadinessReport = {
  /** Primary tenant company we evaluated against, if any. */
  company: string | null;
  /** All checks collected, in display order. */
  items: ReadinessItem[];
  /** True iff every item is done. */
  ready: boolean;
};

/** Fetch the first non-disabled company we can see. Returns null when
 *  no company exists yet — that's its own blocker and the first thing
 *  the user has to resolve. */
async function pickPrimaryCompany(): Promise<string | null> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Company",
        fields: ["name"],
        filters: [["is_group", "=", 0]],
        limit_page_length: 1,
        order_by: "creation asc",
      },
    });
    return rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

async function countNonGroupCostCenters(company: string): Promise<number> {
  try {
    const raw = await frappeCall<{ count?: number } | number>({
      method: "frappe.client.get_count",
      as: "user",
      args: {
        doctype: "Colossal Cost Center",
        filters: [["company", "=", company], ["is_group", "=", 0]],
      },
    });
    return typeof raw === "number" ? raw : raw?.count ?? 0;
  } catch {
    return 0;
  }
}

async function countFiscalYears(): Promise<number> {
  try {
    const raw = await frappeCall<{ count?: number } | number>({
      method: "frappe.client.get_count",
      as: "user",
      args: { doctype: "Fiscal Year" },
    });
    return typeof raw === "number" ? raw : raw?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getAccountingReadiness(): Promise<ReadinessReport> {
  const company = await pickPrimaryCompany();

  if (!company) {
    const noCompanyItem: ReadinessItem = {
      key: "company",
      label: "Create your first company",
      hint: "Accounting posts every transaction against a company. Add Colossal Hub (or your legal entity) first.",
      href: "/accounting/masters/companies/new",
      done: false,
    };
    return { company: null, items: [noCompanyItem], ready: false };
  }

  const [doc, cost_centers, fiscal_years] = await Promise.all([
    getCompanyMaster(company).catch(() => null),
    countNonGroupCostCenters(company),
    countFiscalYears(),
  ]);

  const url = `/accounting/masters/companies/${encodeURIComponent(company)}`;

  const items: ReadinessItem[] = [
    {
      key: "default_receivable_account",
      label: "Pick a Default Receivable account",
      hint: "Every sales invoice posts its Debit To side against this account. Usually something like Debtors - CH.",
      href: url,
      done: !!doc?.defaultReceivableAccount,
    },
    {
      key: "default_payable_account",
      label: "Pick a Default Payable account",
      hint: "Every purchase bill posts its Credit To side against this account. Usually Creditors - CH.",
      href: url,
      done: !!doc?.defaultPayableAccount,
    },
    {
      key: "default_income_account",
      label: "Pick a Default Income account",
      hint: "What revenue account item lines default to on sales invoices. Usually Sales - CH.",
      href: url,
      done: !!doc?.defaultIncomeAccount,
    },
    {
      key: "default_expense_account",
      label: "Pick a Default Expense account",
      hint: "What expense account item lines default to on purchase bills. Usually Cost of Goods Sold - CH or Direct Expenses - CH.",
      href: url,
      done: !!doc?.defaultExpenseAccount,
    },
    {
      key: "default_bank_or_cash_account",
      label: "Pick a Default Bank or Cash account",
      hint: "Where payments default to when you record a receipt or payment. Pick one leaf — either Default Bank or Default Cash is enough.",
      href: url,
      done: !!(doc?.defaultBankAccount || doc?.defaultCashAccount),
    },
    {
      key: "default_cost_center",
      label: "Pick a Default Cost Centre on the Company",
      hint: "Every ledger line is tagged with a cost centre for reporting. Pick the main one so transactions aren't rejected.",
      href: url,
      done: !!doc?.costCenter,
    },
    {
      key: "at_least_one_cost_center",
      label: "Add at least one leaf Cost Centre",
      hint: "The Default Cost Centre above has to be a real leaf (not just a group). Add e.g. HQ, Head Office, or Operations.",
      href: "/accounting/cost-centers",
      done: cost_centers > 0,
    },
    {
      key: "fiscal_year",
      label: "Have a current Fiscal Year",
      hint: "Transactions need a Fiscal Year row covering their posting date, otherwise the save is refused.",
      href: "/accounting/masters/fiscal-year",
      done: fiscal_years > 0,
    },
  ];

  return {
    company,
    items,
    ready: items.every((i) => i.done),
  };
}

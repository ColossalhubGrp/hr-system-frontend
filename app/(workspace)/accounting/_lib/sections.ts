import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, Building2, Landmark, Percent, Calculator,
  Coins, Banknote, CalendarClock, Repeat, Users, BarChart3,
  Layers, BookOpen, Wallet, Receipt, LineChart, Building, Ratio,
  ArrowRightLeft, ArrowLeftRight, ScrollText, ClipboardList,
  BadgeDollarSign, ReceiptText, BookText, FileInput, FileOutput,
  FileSpreadsheet, PieChart, RefreshCw,
} from "lucide-react";

export type Row = {
  label: string;
  href: string;
  icon: LucideIcon;
  desc: string;
};

export type Section = {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  rows: Row[];
};

export const OVERVIEW_ID = "overview";

export const SECTIONS: Section[] = [
  {
    id: OVERVIEW_ID,
    label: "Overview",
    subtitle: "What to do first + the pulse of the ledger today.",
    icon: LayoutGrid,
    rows: [], // Overview renders a custom pane, not the table
  },
  {
    id: "masters",
    label: "Masters",
    subtitle: "The setup layer — companies, calendars, dimensions.",
    icon: Building2,
    rows: [
      { label: "Company", href: "/accounting/masters/companies", icon: Building, desc: "Entity metadata, default currency, tax ID and core default accounts." },
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: Layers, desc: "Manage the ledger account tree per company." },
      { label: "Accounts Settings", href: "/accounting/masters/settings", icon: ScrollText, desc: "Site-wide switches — perpetual stock, credit control, tax handling, close policy." },
      { label: "Fiscal Year", href: "/accounting/masters/fiscal-year", icon: CalendarClock, desc: "Accounting calendar bounds; reports and opening balances key off these." },
      { label: "Accounting Dimension", href: "/accounting/masters/dimensions", icon: Layers, desc: "Extra tags (Branch, Project, Region) that ride on every ledger entry." },
      { label: "Finance Book", href: "/accounting/masters/finance-books", icon: BookText, desc: "Parallel books of account for statutory vs management reporting." },
      { label: "Accounting Period", href: "/accounting/masters/periods", icon: CalendarClock, desc: "Lock a window of dates so no new postings or edits happen inside it." },
      { label: "Payment Term", href: "/accounting/masters/payment-terms", icon: ClipboardList, desc: "Reusable due-date rule — Net 30, Advance 50%, End of Month." },
    ],
  },
  {
    id: "transactions",
    label: "Transactions",
    subtitle: "Everyday postings — invoices, entries, payments.",
    icon: Receipt,
    rows: [
      { label: "Sales Invoice", href: "/accounting/sales-invoices", icon: Receipt, desc: "Bill customers for goods or services with itemised lines and taxes." },
      { label: "Purchase Invoice", href: "/accounting/purchase-invoices", icon: ReceiptText, desc: "Record supplier bills and track outstanding payables." },
      { label: "Journal Entry", href: "/accounting/journal-entries", icon: BookOpen, desc: "Post manual debits and credits across two or more accounts." },
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, desc: "Log incoming receipts and outgoing payments; reconcile against invoices." },
      { label: "Journal Entry Template", href: "/accounting/masters/journal-templates", icon: FileSpreadsheet, desc: "Saved layouts of the accounts grid for recurring postings." },
      { label: "Terms and Conditions", href: "/accounting/masters/terms", icon: ScrollText, desc: "Reusable legal text printed at the foot of quotes and invoices." },
      { label: "Mode of Payment", href: "/accounting/masters/modes-of-payment", icon: Coins, desc: "Payment methods (Cash, Bank Transfer, EcoCash) + per-company default accounts." },
    ],
  },
  {
    id: "tax",
    label: "Tax",
    subtitle: "Sales tax, VAT, WHT — the templates all invoices inherit.",
    icon: Percent,
    rows: [
      { label: "Sales Taxes and Charges Template", href: "/accounting/tax/sales-templates", icon: Percent, desc: "Reusable tax block applied to Sales Invoices, Quotes and Orders." },
      { label: "Purchase Taxes and Charges Template", href: "/accounting/tax/purchase-templates", icon: Percent, desc: "Reusable tax block for Purchase Invoices, POs and RFQs." },
      { label: "Item Tax Template", href: "/accounting/tax/item-templates", icon: Percent, desc: "Per-item override of the sales/purchase tax rate on invoice lines." },
      { label: "Tax Category", href: "/accounting/tax/categories", icon: Layers, desc: "Bucket that Tax Rules use to pick the right template per party or region." },
      { label: "Tax Rule", href: "/accounting/tax/rules", icon: ClipboardList, desc: "Router — pick a tax template based on party, item, category or geography." },
      { label: "Tax Withholding Category", href: "/accounting/tax/withholding", icon: BadgeDollarSign, desc: "WHT/TDS bucket with per-period rates, thresholds and per-company accounts." },
    ],
  },
  {
    id: "cost-centers",
    label: "Cost & Budget",
    subtitle: "Slice the P&L by branch, department or project.",
    icon: Calculator,
    rows: [
      { label: "Chart of Cost Centers", href: "/accounting/cost-centers", icon: Building2, desc: "How the company slices P&L — the cost-centre tree." },
      { label: "Budget", href: "/accounting/budgets", icon: Calculator, desc: "Cap spending against an account, per Cost Center/Project/Dimension." },
      { label: "Accounting Dimension", href: "/accounting/masters/dimensions", icon: Layers, desc: "Extra tags on ledger entries alongside Account + Cost Center." },
      { label: "Cost Center Allocation", href: "/accounting/cost-centers/allocations", icon: PieChart, desc: "Split a main cost centre into sub-centres by percentage." },
      { label: "Budget Variance Report", href: "/accounting/reports/budget-variance", icon: LineChart, desc: "Budget vs actuals per Cost Center or Project, sliced by period." },
      { label: "Monthly Distribution", href: "/accounting/masters/monthly-distribution", icon: BarChart3, desc: "Spread a budget or target across the 12 months of the year." },
    ],
  },
  {
    id: "multi-currency",
    label: "Multi-currency",
    subtitle: "Currencies, exchange rates, and revaluation.",
    icon: Coins,
    rows: [
      { label: "Currency", href: "/accounting/multi-currency/currencies", icon: Coins, desc: "Enabled currencies + symbol + fraction + number format." },
      { label: "Currency Exchange", href: "/accounting/multi-currency/exchange-rates", icon: ArrowRightLeft, desc: "FX rate on a date for a (from → to) currency pair." },
      { label: "Exchange Rate Revaluation", href: "/accounting/multi-currency/revaluation", icon: RefreshCw, desc: "Period-end FX gain/loss on foreign-currency balances." },
    ],
  },
  {
    id: "banking",
    label: "Banking",
    subtitle: "Banks, accounts, reconciliation and statements.",
    icon: Banknote,
    rows: [
      { label: "Bank", href: "/accounting/banking/banks", icon: Banknote, desc: "Financial institution (name, SWIFT, website)." },
      { label: "Bank Account", href: "/accounting/banking/accounts", icon: Wallet, desc: "Account numbers held at a bank — either company-owned or party-owned." },
      { label: "Bank Clearance", href: "/accounting/banking/clearance", icon: ArrowLeftRight, desc: "Mark cheques and transfers as cleared against a bank account." },
      { label: "Bank Reconciliation Tool", href: "/accounting/banking/reconciliation-tool", icon: ArrowLeftRight, desc: "Match bank-statement lines to Payment / Journal Entries." },
      { label: "Bank Reconciliation Statement", href: "/accounting/banking/reconciliation-statement", icon: FileSpreadsheet, desc: "Cleared vs uncleared postings against a bank account, as of a date." },
      { label: "Plaid Settings", href: "/accounting/banking/plaid", icon: ScrollText, desc: "Credentials for linking external US bank accounts via Plaid." },
    ],
  },
  {
    id: "opening",
    label: "Opening & Closing",
    subtitle: "Migrations, imports and year-end.",
    icon: CalendarClock,
    rows: [
      { label: "Opening Invoice Creation Tool", href: "/accounting/tools/opening-invoices", icon: FileInput, desc: "Bulk-create opening customer/supplier balances on cut-over." },
      { label: "Chart of Accounts Importer", href: "/accounting/tools/coa-importer", icon: FileInput, desc: "Seed the whole account hierarchy from a CSV or JSON template." },
      { label: "Period Closing Voucher", href: "/accounting/tools/period-close", icon: CalendarClock, desc: "Sweep P&L into a closing (retained earnings) account at year-end." },
    ],
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    subtitle: "Recurring plans and billing runs.",
    icon: Repeat,
    rows: [
      { label: "Subscription Plan", href: "/accounting/subscriptions/plans", icon: Repeat, desc: "Priced offerings billed on a recurring interval." },
      { label: "Subscription", href: "/accounting/subscriptions", icon: Repeat, desc: "One party subscribed to one or more plans on a schedule." },
      { label: "Subscription Settings", href: "/accounting/subscriptions/settings", icon: ScrollText, desc: "Grace period, auto-cancel and proration for recurring subscriptions." },
    ],
  },
  {
    id: "shares",
    label: "Shares",
    subtitle: "Equity ownership, transfers and balances.",
    icon: Users,
    rows: [
      { label: "Shareholder", href: "/accounting/shares/shareholders", icon: Users, desc: "Register entries — legal name, folio number, company." },
      { label: "Share Transfer", href: "/accounting/shares/transfers", icon: ArrowRightLeft, desc: "Issue new shares, buy them back, or move between shareholders." },
      { label: "Share Ledger", href: "/accounting/shares/ledger", icon: BookText, desc: "Every share transaction in chronological order." },
      { label: "Share Balance", href: "/accounting/shares/balance", icon: Ratio, desc: "Who holds what as of a date." },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    subtitle: "The audit-grade views of the ledger.",
    icon: BarChart3,
    rows: [
      { label: "General Ledger", href: "/accounting/reports/general-ledger", icon: BookText, desc: "Every posting to every account in chronological order." },
      { label: "Trial Balance", href: "/accounting/reports/trial-balance", icon: Ratio, desc: "Opening + movement + closing balance per account for a period." },
      { label: "Profit and Loss", href: "/accounting/reports/profit-and-loss", icon: LineChart, desc: "Income minus expenses, sliced by the period you choose." },
      { label: "Balance Sheet", href: "/accounting/reports/balance-sheet", icon: Layers, desc: "Assets, Liabilities and Equity as of a date." },
      { label: "Cash Flow", href: "/accounting/reports/cash-flow", icon: ArrowLeftRight, desc: "Operating, investing and financing cash movement over the period." },
      { label: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: FileOutput, desc: "Money owed to us, aged into 30/60/90/120-day buckets." },
      { label: "Accounts Payable", href: "/accounting/reports/accounts-payable", icon: FileInput, desc: "Money we owe suppliers, aged into 30/60/90/120-day buckets." },
    ],
  },
];

export function findSection(id: string | undefined): Section {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}

export const LANDMARK_ICON = Landmark;

import Link from "next/link";
import type { Route } from "next";
import {
  Landmark,
  BookOpen,
  Wallet,
  Receipt,
  LineChart,
  Building2,
  Layers,
  Coins,
  Percent,
  Banknote,
  RefreshCw,
  CalendarClock,
  Repeat,
  Users,
  FileInput,
  FileOutput,
  Calculator,
  ArrowLeftRight,
  ScrollText,
  BarChart3,
  PieChart,
  BadgeDollarSign,
  Building,
  BookText,
  ClipboardList,
  Ratio,
  ArrowRightLeft,
  ReceiptText,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";

export const metadata = { title: "Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type Tile = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "live" | "pending";
};

type Section = {
  id: string;
  title: string;
  subtitle: string;
  tiles: Tile[];
};

/**
 * The accounting workspace mirrors ERPNext's Accounting module 1:1 —
 * same sections, same doctypes, same names — rendered in the smart_hr_web
 * design system. `status: "live"` is a shipped Next.js page; `"pending"`
 * links to a route we are still building (it renders a friendly stub
 * until the real page lands).
 */
const SECTIONS: Section[] = [
  {
    id: "shortcuts",
    title: "Shortcuts",
    subtitle: "The everyday desk — invoices, entries, ledger.",
    tiles: [
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: Layers, status: "live" },
      { label: "Sales Invoice", href: "/accounting/sales-invoices", icon: Receipt, status: "live" },
      { label: "Purchase Invoice", href: "/accounting/purchase-invoices", icon: ReceiptText, status: "live" },
      { label: "Journal Entry", href: "/accounting/journal-entries", icon: BookOpen, status: "live" },
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, status: "live" },
      { label: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: FileOutput, status: "live" },
      { label: "General Ledger", href: "/accounting/reports/general-ledger", icon: BookText, status: "live" },
      { label: "Trial Balance", href: "/accounting/reports/trial-balance", icon: Ratio, status: "live" },
      { label: "Dashboard", href: "/accounting/dashboard", icon: BarChart3, status: "pending" },
    ],
  },
  {
    id: "masters",
    title: "Accounting Masters",
    subtitle: "The setup layer — companies, calendars, dimensions.",
    tiles: [
      { label: "Company", href: "/accounting/masters/companies", icon: Building, status: "pending" },
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: Layers, status: "live" },
      { label: "Accounts Settings", href: "/accounting/masters/settings", icon: ScrollText, status: "pending" },
      { label: "Fiscal Year", href: "/accounting/masters/fiscal-year", icon: CalendarClock, status: "pending" },
      { label: "Accounting Dimension", href: "/accounting/masters/dimensions", icon: Layers, status: "pending" },
      { label: "Finance Book", href: "/accounting/masters/finance-books", icon: BookText, status: "pending" },
      { label: "Accounting Period", href: "/accounting/masters/periods", icon: CalendarClock, status: "pending" },
      { label: "Payment Term", href: "/accounting/masters/payment-terms", icon: ClipboardList, status: "pending" },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    subtitle: "How money moves in and out.",
    tiles: [
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, status: "live" },
      { label: "Journal Entry", href: "/accounting/journal-entries", icon: BookOpen, status: "live" },
      { label: "Journal Entry Template", href: "/accounting/masters/journal-templates", icon: FileSpreadsheet, status: "pending" },
      { label: "Terms and Conditions", href: "/accounting/masters/terms", icon: ScrollText, status: "pending" },
      { label: "Mode of Payment", href: "/accounting/masters/modes-of-payment", icon: Coins, status: "pending" },
    ],
  },
  {
    id: "tax",
    title: "Tax Masters",
    subtitle: "Sales tax, VAT, WHT — the templates all invoices inherit.",
    tiles: [
      { label: "Sales Taxes and Charges Template", href: "/accounting/tax/sales-templates", icon: Percent, status: "pending" },
      { label: "Purchase Taxes and Charges Template", href: "/accounting/tax/purchase-templates", icon: Percent, status: "pending" },
      { label: "Item Tax Template", href: "/accounting/tax/item-templates", icon: Percent, status: "pending" },
      { label: "Tax Category", href: "/accounting/tax/categories", icon: Layers, status: "pending" },
      { label: "Tax Rule", href: "/accounting/tax/rules", icon: ClipboardList, status: "pending" },
      { label: "Tax Withholding Category", href: "/accounting/tax/withholding", icon: BadgeDollarSign, status: "pending" },
    ],
  },
  {
    id: "cost-centers",
    title: "Cost Center and Budgeting",
    subtitle: "Slice the P&L by branch, department or project.",
    tiles: [
      { label: "Chart of Cost Centers", href: "/accounting/cost-centers", icon: Building2, status: "live" },
      { label: "Budget", href: "/accounting/budgets", icon: Calculator, status: "pending" },
      { label: "Accounting Dimension", href: "/accounting/masters/dimensions", icon: Layers, status: "pending" },
      { label: "Cost Center Allocation", href: "/accounting/cost-centers/allocations", icon: PieChart, status: "pending" },
      { label: "Budget Variance Report", href: "/accounting/reports/budget-variance", icon: LineChart, status: "pending" },
      { label: "Monthly Distribution", href: "/accounting/masters/monthly-distribution", icon: BarChart3, status: "pending" },
    ],
  },
  {
    id: "multi-currency",
    title: "Multi Currency",
    subtitle: "Currencies, exchange rates, and revaluation.",
    tiles: [
      { label: "Currency", href: "/accounting/multi-currency/currencies", icon: Coins, status: "pending" },
      { label: "Currency Exchange", href: "/accounting/multi-currency/exchange-rates", icon: ArrowRightLeft, status: "pending" },
      { label: "Exchange Rate Revaluation", href: "/accounting/multi-currency/revaluation", icon: RefreshCw, status: "pending" },
    ],
  },
  {
    id: "banking",
    title: "Banking",
    subtitle: "Banks, accounts, reconciliation and statements.",
    tiles: [
      { label: "Bank", href: "/accounting/banking/banks", icon: Banknote, status: "pending" },
      { label: "Bank Account", href: "/accounting/banking/accounts", icon: Wallet, status: "pending" },
      { label: "Bank Clearance", href: "/accounting/banking/clearance", icon: ArrowLeftRight, status: "pending" },
      { label: "Bank Reconciliation Tool", href: "/accounting/banking/reconciliation-tool", icon: ArrowLeftRight, status: "pending" },
      { label: "Bank Reconciliation Statement", href: "/accounting/banking/reconciliation-statement", icon: FileSpreadsheet, status: "pending" },
      { label: "Plaid Settings", href: "/accounting/banking/plaid", icon: ScrollText, status: "pending" },
    ],
  },
  {
    id: "opening",
    title: "Opening and Closing",
    subtitle: "Migrations, imports and year-end.",
    tiles: [
      { label: "Opening Invoice Creation Tool", href: "/accounting/tools/opening-invoices", icon: FileInput, status: "pending" },
      { label: "Chart of Accounts Importer", href: "/accounting/tools/coa-importer", icon: FileInput, status: "pending" },
      { label: "Period Closing Voucher", href: "/accounting/tools/period-close", icon: CalendarClock, status: "pending" },
    ],
  },
  {
    id: "subscriptions",
    title: "Subscription Management",
    subtitle: "Recurring plans and billing runs.",
    tiles: [
      { label: "Subscription Plan", href: "/accounting/subscriptions/plans", icon: Repeat, status: "pending" },
      { label: "Subscription", href: "/accounting/subscriptions", icon: Repeat, status: "pending" },
      { label: "Subscription Settings", href: "/accounting/subscriptions/settings", icon: ScrollText, status: "pending" },
    ],
  },
  {
    id: "shares",
    title: "Share Management",
    subtitle: "Equity ownership, transfers and balances.",
    tiles: [
      { label: "Shareholder", href: "/accounting/shares/shareholders", icon: Users, status: "pending" },
      { label: "Share Transfer", href: "/accounting/shares/transfers", icon: ArrowRightLeft, status: "pending" },
      { label: "Share Ledger", href: "/accounting/shares/ledger", icon: BookText, status: "pending" },
      { label: "Share Balance", href: "/accounting/shares/balance", icon: Ratio, status: "pending" },
    ],
  },
  {
    id: "reports",
    title: "Financial Reports",
    subtitle: "The audit-grade views of the ledger.",
    tiles: [
      { label: "General Ledger", href: "/accounting/reports/general-ledger", icon: BookText, status: "live" },
      { label: "Trial Balance", href: "/accounting/reports/trial-balance", icon: Ratio, status: "live" },
      { label: "Profit and Loss", href: "/accounting/reports/profit-and-loss", icon: LineChart, status: "live" },
      { label: "Balance Sheet", href: "/accounting/reports/balance-sheet", icon: Layers, status: "live" },
      { label: "Cash Flow", href: "/accounting/reports/cash-flow", icon: ArrowLeftRight, status: "live" },
      { label: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: FileOutput, status: "live" },
      { label: "Accounts Payable", href: "/accounting/reports/accounts-payable", icon: FileInput, status: "live" },
    ],
  },
];

export default function AccountingLandingPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        icon={Landmark}
        crumb="Accounting"
        title="Accounting"
        subtitle="Full general ledger, invoicing, payments, tax, budgeting and financial reporting — mirroring ERPNext, rendered in the Colossal HR design system."
      />

      {SECTIONS.map((section) => (
        <section key={section.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.subtitle}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.tiles.filter((t) => t.status === "live").length} / {section.tiles.length} live
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {section.tiles.map((tile) => (
              <ModuleTile key={`${section.id}:${tile.href}:${tile.label}`} tile={tile} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ModuleTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  const live = tile.status === "live";
  const inner = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-800/5 text-ink-800">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{tile.label}</div>
        {!live && (
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </div>
        )}
      </div>
    </>
  );
  if (live) {
    return (
      <Link
        href={tile.href as Route}
        className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition hover:border-ink-800 hover:bg-muted/40"
        aria-label={`${tile.label} — open`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div
      className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 opacity-80"
      aria-label={`${tile.label} — coming soon`}
      aria-disabled="true"
      title="Coming soon"
    >
      {inner}
    </div>
  );
}

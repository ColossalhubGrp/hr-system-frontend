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
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata = { title: "Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type Row = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  status: "live" | "pending";
};

type Section = {
  id: string;
  label: string; // tab label
  subtitle: string; // pill under the tab
  rows: Row[];
};

/**
 * Same 11 ERPNext Accounting sections, now rendered as a Settings-style
 * tab strip + Setting / Description / chevron table so the whole module
 * home reads like /settings. Each row is one DocType or tool; `pending`
 * rows render as un-clickable muted rows with a "Coming soon" chip.
 */
const SECTIONS: Section[] = [
  {
    id: "shortcuts",
    label: "Shortcuts",
    subtitle: "The everyday desk — invoices, entries, ledger.",
    rows: [
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: Layers, desc: "The account tree per company — assets, liabilities, equity, income, expenses.", status: "live" },
      { label: "Sales Invoice", href: "/accounting/sales-invoices", icon: Receipt, desc: "Bill customers for goods or services with itemised lines and taxes.", status: "live" },
      { label: "Purchase Invoice", href: "/accounting/purchase-invoices", icon: ReceiptText, desc: "Record supplier bills and track outstanding payables.", status: "live" },
      { label: "Journal Entry", href: "/accounting/journal-entries", icon: BookOpen, desc: "Post manual debits and credits across two or more accounts.", status: "live" },
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, desc: "Log incoming receipts and outgoing payments; reconcile against invoices.", status: "live" },
      { label: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: FileOutput, desc: "What customers owe, aged into 30/60/90/120-day buckets.", status: "live" },
      { label: "General Ledger", href: "/accounting/reports/general-ledger", icon: BookText, desc: "Every posting to every account in chronological order.", status: "live" },
      { label: "Trial Balance", href: "/accounting/reports/trial-balance", icon: Ratio, desc: "Opening + movement + closing balance per account for a period.", status: "live" },
      { label: "Dashboard", href: "/accounting/dashboard", icon: BarChart3, desc: "KPI strip + monthly year-to-date P&L for the current company.", status: "live" },
    ],
  },
  {
    id: "masters",
    label: "Accounting Masters",
    subtitle: "The setup layer — companies, calendars, dimensions.",
    rows: [
      { label: "Company", href: "/accounting/masters/companies", icon: Building, desc: "Entity metadata, default currency, tax ID and core default accounts.", status: "live" },
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: Layers, desc: "Manage the ledger account tree per company.", status: "live" },
      { label: "Accounts Settings", href: "/accounting/masters/settings", icon: ScrollText, desc: "Site-wide switches — perpetual stock, credit control, tax handling, close policy.", status: "live" },
      { label: "Fiscal Year", href: "/accounting/masters/fiscal-year", icon: CalendarClock, desc: "Accounting calendar bounds; reports and opening balances key off these.", status: "live" },
      { label: "Accounting Dimension", href: "/accounting/masters/dimensions", icon: Layers, desc: "Extra tags (Branch, Project, Region) that ride on every GL entry.", status: "live" },
      { label: "Finance Book", href: "/accounting/masters/finance-books", icon: BookText, desc: "Parallel books of account for statutory vs management reporting.", status: "live" },
      { label: "Accounting Period", href: "/accounting/masters/periods", icon: CalendarClock, desc: "Lock a window of dates so no new postings or edits happen inside it.", status: "live" },
      { label: "Payment Term", href: "/accounting/masters/payment-terms", icon: ClipboardList, desc: "Reusable due-date rule — Net 30, Advance 50%, End of Month.", status: "live" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    subtitle: "How money moves in and out.",
    rows: [
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, desc: "Log receipts, payments and internal transfers with allocations.", status: "live" },
      { label: "Journal Entry", href: "/accounting/journal-entries", icon: BookOpen, desc: "Post manual debits and credits across two or more accounts.", status: "live" },
      { label: "Journal Entry Template", href: "/accounting/masters/journal-templates", icon: FileSpreadsheet, desc: "Saved layouts of the accounts grid for recurring postings.", status: "live" },
      { label: "Terms and Conditions", href: "/accounting/masters/terms", icon: ScrollText, desc: "Reusable legal text printed at the foot of quotes and invoices.", status: "live" },
      { label: "Mode of Payment", href: "/accounting/masters/modes-of-payment", icon: Coins, desc: "Payment methods (Cash, Bank Transfer, EcoCash) + per-company default accounts.", status: "live" },
    ],
  },
  {
    id: "tax",
    label: "Tax Masters",
    subtitle: "Sales tax, VAT, WHT — the templates all invoices inherit.",
    rows: [
      { label: "Sales Taxes and Charges Template", href: "/accounting/tax/sales-templates", icon: Percent, desc: "Reusable tax block applied to Sales Invoices, Quotes and Orders.", status: "live" },
      { label: "Purchase Taxes and Charges Template", href: "/accounting/tax/purchase-templates", icon: Percent, desc: "Reusable tax block for Purchase Invoices, POs and RFQs.", status: "live" },
      { label: "Item Tax Template", href: "/accounting/tax/item-templates", icon: Percent, desc: "Per-item override of the sales/purchase tax rate on invoice lines.", status: "live" },
      { label: "Tax Category", href: "/accounting/tax/categories", icon: Layers, desc: "Bucket that Tax Rules use to pick the right template per party or region.", status: "live" },
      { label: "Tax Rule", href: "/accounting/tax/rules", icon: ClipboardList, desc: "Router — pick a tax template based on party, item, category or geography.", status: "live" },
      { label: "Tax Withholding Category", href: "/accounting/tax/withholding", icon: BadgeDollarSign, desc: "WHT/TDS bucket with per-period rates, thresholds and per-company accounts.", status: "live" },
    ],
  },
  {
    id: "cost-centers",
    label: "Cost Center & Budgeting",
    subtitle: "Slice the P&L by branch, department or project.",
    rows: [
      { label: "Chart of Cost Centers", href: "/accounting/cost-centers", icon: Building2, desc: "How the company slices P&L — the cost-centre tree.", status: "live" },
      { label: "Budget", href: "/accounting/budgets", icon: Calculator, desc: "Cap spending against an account, per Cost Center/Project/Dimension.", status: "live" },
      { label: "Accounting Dimension", href: "/accounting/masters/dimensions", icon: Layers, desc: "Extra tags on GL entries alongside Account + Cost Center.", status: "live" },
      { label: "Cost Center Allocation", href: "/accounting/cost-centers/allocations", icon: PieChart, desc: "Split a main cost centre into sub-centres by percentage.", status: "live" },
      { label: "Budget Variance Report", href: "/accounting/reports/budget-variance", icon: LineChart, desc: "Budget vs actuals per Cost Center or Project, sliced by period.", status: "live" },
      { label: "Monthly Distribution", href: "/accounting/masters/monthly-distribution", icon: BarChart3, desc: "Spread a budget or target across the 12 months of the year.", status: "live" },
    ],
  },
  {
    id: "multi-currency",
    label: "Multi Currency",
    subtitle: "Currencies, exchange rates, and revaluation.",
    rows: [
      { label: "Currency", href: "/accounting/multi-currency/currencies", icon: Coins, desc: "Enabled currencies + symbol + fraction + number format.", status: "live" },
      { label: "Currency Exchange", href: "/accounting/multi-currency/exchange-rates", icon: ArrowRightLeft, desc: "FX rate on a date for a (from → to) currency pair.", status: "live" },
      { label: "Exchange Rate Revaluation", href: "/accounting/multi-currency/revaluation", icon: RefreshCw, desc: "Period-end FX gain/loss on foreign-currency balances.", status: "live" },
    ],
  },
  {
    id: "banking",
    label: "Banking",
    subtitle: "Banks, accounts, reconciliation and statements.",
    rows: [
      { label: "Bank", href: "/accounting/banking/banks", icon: Banknote, desc: "Financial institution (name, SWIFT, website).", status: "live" },
      { label: "Bank Account", href: "/accounting/banking/accounts", icon: Wallet, desc: "Account numbers held at a bank — either company-owned or party-owned.", status: "live" },
      { label: "Bank Clearance", href: "/accounting/banking/clearance", icon: ArrowLeftRight, desc: "Mark cheques and transfers as cleared against a bank account.", status: "live" },
      { label: "Bank Reconciliation Tool", href: "/accounting/banking/reconciliation-tool", icon: ArrowLeftRight, desc: "Match bank-statement lines to Payment / Journal Entries.", status: "live" },
      { label: "Bank Reconciliation Statement", href: "/accounting/banking/reconciliation-statement", icon: FileSpreadsheet, desc: "Cleared vs uncleared postings against a bank account, as of a date.", status: "live" },
      { label: "Plaid Settings", href: "/accounting/banking/plaid", icon: ScrollText, desc: "Credentials for linking external US bank accounts via Plaid.", status: "live" },
    ],
  },
  {
    id: "opening",
    label: "Opening & Closing",
    subtitle: "Migrations, imports and year-end.",
    rows: [
      { label: "Opening Invoice Creation Tool", href: "/accounting/tools/opening-invoices", icon: FileInput, desc: "Bulk-create opening customer/supplier balances on cut-over.", status: "live" },
      { label: "Chart of Accounts Importer", href: "/accounting/tools/coa-importer", icon: FileInput, desc: "Seed the whole account hierarchy from a CSV or JSON template.", status: "live" },
      { label: "Period Closing Voucher", href: "/accounting/tools/period-close", icon: CalendarClock, desc: "Sweep P&L into a closing (retained earnings) account at year-end.", status: "live" },
    ],
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    subtitle: "Recurring plans and billing runs.",
    rows: [
      { label: "Subscription Plan", href: "/accounting/subscriptions/plans", icon: Repeat, desc: "Priced offerings billed on a recurring interval.", status: "live" },
      { label: "Subscription", href: "/accounting/subscriptions", icon: Repeat, desc: "One party subscribed to one or more plans on a schedule.", status: "live" },
      { label: "Subscription Settings", href: "/accounting/subscriptions/settings", icon: ScrollText, desc: "Grace period, auto-cancel and proration for recurring subscriptions.", status: "live" },
    ],
  },
  {
    id: "shares",
    label: "Shares",
    subtitle: "Equity ownership, transfers and balances.",
    rows: [
      { label: "Shareholder", href: "/accounting/shares/shareholders", icon: Users, desc: "Register entries — legal name, folio number, company.", status: "live" },
      { label: "Share Transfer", href: "/accounting/shares/transfers", icon: ArrowRightLeft, desc: "Issue new shares, buy them back, or move between shareholders.", status: "live" },
      { label: "Share Ledger", href: "/accounting/shares/ledger", icon: BookText, desc: "Every share transaction in chronological order.", status: "live" },
      { label: "Share Balance", href: "/accounting/shares/balance", icon: Ratio, desc: "Who holds what as of a date.", status: "live" },
    ],
  },
  {
    id: "reports",
    label: "Financial Reports",
    subtitle: "The audit-grade views of the ledger.",
    rows: [
      { label: "General Ledger", href: "/accounting/reports/general-ledger", icon: BookText, desc: "Every posting to every account in chronological order.", status: "live" },
      { label: "Trial Balance", href: "/accounting/reports/trial-balance", icon: Ratio, desc: "Opening + movement + closing balance per account for a period.", status: "live" },
      { label: "Profit and Loss", href: "/accounting/reports/profit-and-loss", icon: LineChart, desc: "Income minus expenses, sliced by the period you choose.", status: "live" },
      { label: "Balance Sheet", href: "/accounting/reports/balance-sheet", icon: Layers, desc: "Assets, Liabilities and Equity as of a date.", status: "live" },
      { label: "Cash Flow", href: "/accounting/reports/cash-flow", icon: ArrowLeftRight, desc: "Operating, investing and financing cash movement over the period.", status: "live" },
      { label: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: FileOutput, desc: "Money owed to us, aged into 30/60/90/120-day buckets.", status: "live" },
      { label: "Accounts Payable", href: "/accounting/reports/accounts-payable", icon: FileInput, desc: "Money we owe suppliers, aged into 30/60/90/120-day buckets.", status: "live" },
    ],
  },
];

export default function AccountingLandingPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Landmark className="h-3.5 w-3.5" />
          Accounting
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Accounting
        </h1>
        <p className="text-sm text-muted-foreground">
          Full general ledger, invoicing, payments, tax, budgeting and
          financial reporting — mirroring ERPNext, rendered in the
          Colossal HR design system.
        </p>
      </header>

      <Tabs defaultValue={SECTIONS[0].id} className="flex flex-col gap-3">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="text-xs sm:text-sm">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="m-0">
            <SectionTable subtitle={s.subtitle} rows={s.rows} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SectionTable({ subtitle, rows }: { subtitle: string; rows: Row[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <p className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const Icon = r.icon;
              if (r.status !== "live") {
                return (
                  <TableRow key={`${r.href}:${r.label}`} className="opacity-60">
                    <TableCell className="align-top font-medium">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>{r.label}</span>
                        <span className="rounded-chip bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          Soon
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {r.desc}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                );
              }
              return (
                <TableRow key={`${r.href}:${r.label}`} className="group">
                  <TableCell className="align-top font-medium">
                    <Link
                      href={r.href as Route}
                      className="flex items-center gap-2 text-foreground hover:underline"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      {r.label}
                    </Link>
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    <Link href={r.href as Route} className="block">
                      {r.desc}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Link
                      href={r.href as Route}
                      className="inline-flex text-muted-foreground group-hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

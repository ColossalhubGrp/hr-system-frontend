import Link from "next/link";
import type { Route } from "next";
import {
  Landmark,
  BookOpen,
  Wallet,
  Receipt,
  LineChart,
  FileText,
  Building2,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";

export const metadata = { title: "Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type ModuleCard = {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "live" | "coming-soon";
};

/**
 * Phase 1 lands with Journal Entries only. The other cards are
 * intentional placeholders so the module landing surface reads
 * as an accounting workspace, not a one-page stub. Each stub links
 * to a `/accounting/<slug>` route that will 404 until we build it —
 * that surfaces the gap explicitly rather than hiding it.
 */
const MODULES: ModuleCard[] = [
  {
    label: "Journal Entries",
    description:
      "Post manual debits and credits across accounts — the workhorse for any ledger correction, accrual or reclass.",
    href: "/accounting/journal-entries",
    icon: BookOpen,
    status: "live",
  },
  {
    label: "Chart of Accounts",
    description:
      "Browse and edit the accounts tree — assets, liabilities, equity, income, expenses — per company.",
    href: "/accounting/chart-of-accounts",
    icon: Layers,
    status: "coming-soon",
  },
  {
    label: "Payment Entries",
    description:
      "Record incoming and outgoing payments and reconcile them against invoices and expense claims.",
    href: "/accounting/payment-entries",
    icon: Wallet,
    status: "coming-soon",
  },
  {
    label: "Invoices",
    description:
      "Sales invoices, purchase invoices, credit notes and debit notes — full lifecycle.",
    href: "/accounting/invoices",
    icon: Receipt,
    status: "coming-soon",
  },
  {
    label: "Reports",
    description:
      "General Ledger, Trial Balance, Profit & Loss, Balance Sheet, Cash Flow, Aged Receivable / Payable.",
    href: "/accounting/reports",
    icon: LineChart,
    status: "coming-soon",
  },
  {
    label: "Cost Centers",
    description:
      "Track expenses by branch, department or project so P&L slices by whatever the business needs.",
    href: "/accounting/cost-centers",
    icon: Building2,
    status: "coming-soon",
  },
  {
    label: "Fiscal Year & Periods",
    description:
      "Manage fiscal year boundaries and accounting periods, close months, and freeze historicals.",
    href: "/accounting/fiscal-year",
    icon: FileText,
    status: "coming-soon",
  },
];

export default function AccountingLandingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Landmark}
        crumb="Accounting"
        title="Accounting"
        subtitle="General ledger, journal entries, invoices and financial reports."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <ModuleTile key={m.href} card={m} />
        ))}
      </div>
    </div>
  );
}

function ModuleTile({ card }: { card: ModuleCard }) {
  const Icon = card.icon;
  const live = card.status === "live";
  const cls = live
    ? "border-border/70 bg-card hover:border-ink-800 hover:bg-muted/40"
    : "border-border/40 bg-muted/20 hover:bg-muted/30";
  return (
    <Link
      href={card.href as Route}
      className={`group flex flex-col gap-2 rounded-xl border p-4 transition ${cls}`}
      aria-label={`${card.label} — ${live ? "open" : "coming soon"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-800/5 text-ink-800">
          <Icon className="h-5 w-5" />
        </div>
        {!live && (
          <span className="rounded-chip bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{card.label}</h2>
        <p className="text-sm text-muted-foreground">{card.description}</p>
      </div>
    </Link>
  );
}

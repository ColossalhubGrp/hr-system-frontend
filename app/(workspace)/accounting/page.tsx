import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, ArrowRight, Receipt, Wallet, BookOpen, FileSpreadsheet } from "lucide-react";
import { SECTIONS, OVERVIEW_ID, findSection, type Section, type Row } from "./_lib/sections";
import { SectionNav } from "./_components/section-nav";
import { SetupChecklist } from "./_components/setup-checklist";
import { DismissibleSetup } from "./_components/dismissible-setup";
import { Suspense } from "react";

export const metadata = { title: "Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { s?: string };

export default function AccountingLandingPage({
  searchParams,
}: {
  searchParams?: SP;
}) {
  const active = findSection(searchParams?.s);
  const isOverview = active.id === OVERVIEW_ID;
  const SectionIcon = active.icon;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero header — brand primary band, dense info strip */}
      <header className="rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">
              Finance
            </div>
            <h1 className="mt-1 text-[26px] font-bold leading-tight">
              Accounting
            </h1>
            <p className="mt-1 max-w-xl text-sm text-primary-foreground/80">
              Full general ledger, invoicing, payments, tax, budgeting and
              financial reporting — everything the finance team needs to
              keep the books.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HeroCta href="/accounting/sales-invoices/new" icon={Receipt} label="New sales invoice" />
            <HeroCta href="/accounting/purchase-invoices/new" icon={FileSpreadsheet} label="New purchase invoice" />
            <HeroCta href="/accounting/payment-entries/new" icon={Wallet} label="New payment" />
            <HeroCta href="/accounting/journal-entries/new" icon={BookOpen} label="Journal entry" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <SectionNav active={active.id} />

        <div className="flex min-w-0 flex-col gap-5">
          {/* Breadcrumb strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link href={"/accounting" as Route} className="hover:text-foreground">Accounting</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-foreground">{active.label}</span>
          </div>

          {/* Section pane header */}
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <SectionIcon className="h-5 w-5 text-primary" />
              {active.label}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{active.subtitle}</p>
          </div>

          {/* Pane body */}
          {isOverview ? (
            <OverviewPane />
          ) : (
            <SectionRows section={active} />
          )}
        </div>
      </div>
    </div>
  );
}

function HeroCta({
  href, icon: Icon, label,
}: {
  href: string; icon: React.ComponentType<{ className?: string }>; label: string;
}) {
  return (
    <Link
      href={href as Route}
      className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-white/15 px-3 text-xs font-semibold text-primary-foreground backdrop-blur-sm transition hover:bg-white/25"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

function OverviewPane() {
  return (
    <div className="flex flex-col gap-5">
      {/* First-time setup checklist — server-detects completion */}
      <DismissibleSetup>
        <Suspense fallback={<ChecklistSkeleton />}>
          <SetupChecklist />
        </Suspense>
      </DismissibleSetup>

      {/* Quick-access tiles — primary everyday destinations */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Quick access
          </h3>
          <Link href={"/accounting/dashboard" as Route}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Full dashboard
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <QuickTile href="/accounting/chart-of-accounts" title="Chart of Accounts" blurb="The account tree." />
          <QuickTile href="/accounting/sales-invoices" title="Sales Invoices" blurb="Bill customers." />
          <QuickTile href="/accounting/purchase-invoices" title="Purchase Invoices" blurb="Record supplier bills." />
          <QuickTile href="/accounting/payment-entries" title="Payment Entries" blurb="Money in / out." />
          <QuickTile href="/accounting/reports/general-ledger" title="General Ledger" blurb="Every posting." />
          <QuickTile href="/accounting/reports/trial-balance" title="Trial Balance" blurb="Opening + close per account." />
          <QuickTile href="/accounting/reports/profit-and-loss" title="Profit & Loss" blurb="Income minus expenses." />
          <QuickTile href="/accounting/reports/balance-sheet" title="Balance Sheet" blurb="Assets, liabilities, equity." />
        </div>
      </section>
    </div>
  );
}

function QuickTile({
  href, title, blurb,
}: {
  href: string; title: string; blurb: string;
}) {
  return (
    <Link
      href={href as Route}
      className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-3 transition hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-sm font-bold text-foreground">{title}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <span className="text-[11px] text-muted-foreground">{blurb}</span>
    </Link>
  );
}

function ChecklistSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-primary/20 bg-primary/[0.03] p-5">
      <div className="h-4 w-40 rounded bg-primary/20" />
      <div className="mt-2 h-6 w-80 rounded bg-primary/15" />
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-border/70 bg-card" />
        ))}
      </div>
    </div>
  );
}

/**
 * Each non-Overview section renders its rows as a tight card grid
 * instead of the old "table of settings" look — matches how real
 * accounting navs feel (think shortcut cards on QuickBooks / Xero).
 */
function SectionRows({ section }: { section: Section }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {section.rows.map((r) => (
        <RowCard key={`${r.href}:${r.label}`} row={r} />
      ))}
    </div>
  );
}

function RowCard({ row: r }: { row: Row }) {
  const Icon = r.icon;
  return (
    <Link
      href={r.href as Route}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-foreground">{r.label}</div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{r.desc}</p>
      </div>
    </Link>
  );
}

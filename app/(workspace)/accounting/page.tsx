import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { ChevronRight, ArrowRight, Receipt, Wallet, BookOpen, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/cn";
import { OVERVIEW_ID, findSection, type Section, type Row } from "./_lib/sections";
import { loadOverviewData } from "./_lib/overview-data";
import { loadSectionCounts } from "./_lib/section-counts";
import { SetupChecklist } from "./_components/setup-checklist";
import { DismissibleSetup } from "./_components/dismissible-setup";
import { KpiStrip } from "./_components/kpi-strip";
import { NeedsAttention } from "./_components/needs-attention";
import { MiniPnlChart } from "./_components/mini-pnl-chart";
import { RecentActivity } from "./_components/recent-activity";
import { CommandPalette } from "./_components/command-palette";
import { CommandKChip } from "./_components/command-k-chip";

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
      {/* Hero only on Overview — on section views the breadcrumb +
          section header carries enough context. */}
      {isOverview && (
        <header className="rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">
                Finance
              </div>
              <h1 className="mt-1 text-[26px] font-bold leading-tight">Accounting</h1>
              <p className="mt-1 max-w-xl text-sm text-primary-foreground/80">
                Live view of the ledger — invoices, payments, tax, cash position
                and what&apos;s waiting on your attention.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CommandKChip />
              <HeroCta href="/accounting/sales-invoices/new" icon={Receipt} label="Invoice" />
              <HeroCta href="/accounting/purchase-invoices/new" icon={FileSpreadsheet} label="Bill" />
              <HeroCta href="/accounting/payment-entries/new" icon={Wallet} label="Payment" />
              <HeroCta href="/accounting/journal-entries/new" icon={BookOpen} label="Journal" />
            </div>
          </div>
        </header>
      )}

      {/* Breadcrumb — only on section views. Overview is the root. */}
      {!isOverview && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link href={"/accounting" as Route} className="hover:text-foreground">Accounting</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground">{active.label}</span>
        </div>
      )}

      {/* Section pane header — only on sub-sections. Overview has its own hero. */}
      {!isOverview && (
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <SectionIcon className="h-5 w-5 text-primary" />
            {active.label}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{active.subtitle}</p>
        </div>
      )}

      {isOverview ? (
        <Suspense fallback={<OverviewSkeleton />}>
          <OverviewPane />
        </Suspense>
      ) : (
        <Suspense fallback={<SectionRowsSkeleton n={active.rows.length} />}>
          <SectionRows section={active} />
        </Suspense>
      )}

      {/* Command palette (⌘K) — mounted here so it's available on
          every /accounting view without a layout change. */}
      <CommandPalette />
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

async function OverviewPane() {
  const data = await loadOverviewData();

  return (
    <div className="flex flex-col gap-5">
      {/* KPI strip — six tiles with real numbers + inline sparklines */}
      <KpiStrip data={data} />

      {/* Two-column: alerts on the left, recent activity on the right */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <NeedsAttention data={data} />
          <DismissibleSetup>
            <SetupChecklist />
          </DismissibleSetup>
        </div>
        <div className="lg:col-span-3 flex flex-col gap-5">
          <MiniPnlChart data={data} />
          <RecentActivity data={data} />
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[108px] animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2 h-[320px] animate-pulse rounded-xl border bg-card" />
        <div className="lg:col-span-3 h-[320px] animate-pulse rounded-xl border bg-card" />
      </div>
    </div>
  );
}

/**
 * Non-Overview sections — a tight 3-column card grid, one card per
 * row. Reads like QuickBooks / Xero rather than a settings table.
 * Row cards show a live record count ("142 accounts") when the row
 * resolves to a known doctype.
 */
async function SectionRows({ section }: { section: Section }) {
  const counts = await loadSectionCounts(section.rows.map((r) => r.label));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {section.rows.map((r) => (
        <RowCard key={`${r.href}:${r.label}`} row={r} count={counts.get(r.label) ?? null} />
      ))}
    </div>
  );
}

function RowCard({ row: r, count }: { row: Row; count: number | null }) {
  const Icon = r.icon;
  const countLabel =
    count === null ? null
    : count === 0 ? "Not set up yet"
    : count === 1 ? "1 record"
    : `${count.toLocaleString()} records`;
  return (
    <Link
      href={r.href as Route}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {countLabel && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              count === 0
                ? "bg-amber-100 text-amber-700"
                : "bg-primary/10 text-primary",
            )}
          >
            {countLabel}
          </span>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-foreground">{r.label}</div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{r.desc}</p>
      </div>
    </Link>
  );
}

function SectionRowsSkeleton({ n }: { n: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: Math.max(3, n) }).map((_, i) => (
        <div key={i} className="h-[112px] animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

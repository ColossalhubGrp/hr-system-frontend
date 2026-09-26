import Link from "next/link";
import type { Route } from "next";
import { ArrowRightLeft, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listCurrencyExchanges, type CurrencyExchange } from "@/lib/frappe/multi-currency/currency-exchange";

export const metadata = { title: "Currency Exchange Rates · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function ExchangeRatesPage() {
  const rows = await listCurrencyExchanges();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={ArrowRightLeft}
        crumb="Accounting · Multi-Currency · Exchange Rates"
        title="Currency Exchange Rates"
        subtitle={`${rows.length.toLocaleString()} rates recorded — used for cross-currency invoices and revaluation.`}
        actions={
          <Link href={"/accounting/multi-currency/exchange-rates/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New rate
          </Link>
        }
      />
      <DataTable<CurrencyExchange>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/multi-currency/exchange-rates/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No exchange rates yet.</p>}
        columns={[
          { header: "Date", cell: (r) => r.date },
          { header: "Pair", cell: (r) => <span className="font-mono">{r.fromCurrency} → {r.toCurrency}</span> },
          { header: "Rate", cell: (r) => r.exchangeRate.toFixed(6), className: "text-right tabular-nums" },
          { header: "Buying", cell: (r) => (r.forBuying ? "✓" : "—") },
          { header: "Selling", cell: (r) => (r.forSelling ? "✓" : "—") },
        ]}
      />
    </div>
  );
}

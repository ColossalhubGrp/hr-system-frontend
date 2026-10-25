import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import type { Route } from "next";
import { Coins, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listCurrencies, type Currency } from "@/lib/frappe/multi-currency/currency";

export const metadata = { title: "Currencies · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function CurrenciesPage() {
  const rows = await listCurrencies();
  const enabled = rows.filter((r) => r.enabled).length;
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/multi-currency/currencies" />
      <PageHeader
        icon={Coins}
        crumb="Accounting · Multi-Currency · Currencies"
        title="Currencies"
        subtitle={`${enabled} enabled of ${rows.length} — only enabled currencies show in pickers.`}
        actions={
          <Link href={"/accounting/multi-currency/currencies/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New currency
          </Link>
        }
      />
      <DataTable<Currency>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/multi-currency/currencies/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No currencies yet.</p>}
        columns={[
          { header: "Code", cell: (r) => <Link href={`/accounting/multi-currency/currencies/${encodeURIComponent(r.name)}` as Route} className="font-mono font-semibold text-foreground hover:underline">{r.name}</Link> },
          { header: "Name", cell: (r) => r.currencyName },
          { header: "Symbol", cell: (r) => r.symbol ?? "—" },
          { header: "Fraction", cell: (r) => (r.fraction ? `${r.fraction} × ${r.fractionUnits}` : "—") },
          { header: "Status", cell: (r) => <StatusPill status={r.enabled ? "Enabled" : "Disabled"} /> },
        ]}
      />
    </div>
  );
}

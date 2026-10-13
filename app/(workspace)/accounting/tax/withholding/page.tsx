import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import type { Route } from "next";
import { BadgeDollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listTaxWithholding, type TaxWithholdingCategory } from "@/lib/frappe/tax/withholding";

export const metadata = { title: "Tax Withholding · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function TaxWithholdingPage() {
  const rows = await listTaxWithholding();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/tax/withholding" />
      <PageHeader
        icon={BadgeDollarSign}
        crumb="Accounting · Tax · Withholding Categories"
        title="Tax Withholding Categories"
        subtitle={`${rows.length.toLocaleString()} WHT / TDS categories with per-period rates and thresholds.`}
        actions={
          <Link href={"/accounting/tax/withholding/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New category
          </Link>
        }
      />
      <DataTable<TaxWithholdingCategory>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/tax/withholding/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No categories yet.</p>}
        columns={[
          { header: "Category", cell: (r) => <Link href={`/accounting/tax/withholding/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.category}</Link> },
          { header: "Round-off?", cell: (r) => (r.roundOff ? "Yes" : "No") },
          { header: "Uses party ledger?", cell: (r) => (r.considerPartyLedgerAmount ? "Yes" : "No") },
        ]}
      />
    </div>
  );
}

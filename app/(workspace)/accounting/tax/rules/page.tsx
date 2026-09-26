import Link from "next/link";
import type { Route } from "next";
import { ClipboardList, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listTaxRules, type TaxRuleRow } from "@/lib/frappe/tax/rule";

export const metadata = { title: "Tax Rules · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function TaxRulesPage() {
  const rows = await listTaxRules();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={ClipboardList}
        crumb="Accounting · Tax · Rules"
        title="Tax Rules"
        subtitle={`${rows.length.toLocaleString()} rules — decide which tax template applies per party, item or geography.`}
        actions={
          <Link href={"/accounting/tax/rules/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New rule
          </Link>
        }
      />
      <DataTable<TaxRuleRow>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/tax/rules/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No rules yet.</p>}
        columns={[
          { header: "Rule", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Kind", cell: (r) => r.taxType },
          { header: "Category", cell: (r) => r.taxCategory ?? "—" },
          {
            header: "Template",
            cell: (r) => r.salesTaxTemplate ?? r.purchaseTaxTemplate ?? "—",
          },
          { header: "Party", cell: (r) => r.customer ?? r.supplier ?? "any" },
          { header: "Priority", cell: (r) => String(r.priority), className: "text-right tabular-nums" },
        ]}
      />
    </div>
  );
}

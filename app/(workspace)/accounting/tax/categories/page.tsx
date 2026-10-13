import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import type { Route } from "next";
import { Layers, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listTaxCategories, type TaxCategory } from "@/lib/frappe/tax/category";

export const metadata = { title: "Tax Categories · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function TaxCategoriesPage() {
  const rows = await listTaxCategories();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/tax/categories" />
      <PageHeader
        icon={Layers}
        crumb="Accounting · Tax · Categories"
        title="Tax Categories"
        subtitle={`${rows.length.toLocaleString()} categories — used by Tax Rules to pick the right template per party/region.`}
        actions={
          <Link href={"/accounting/tax/categories/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New category
          </Link>
        }
      />
      <DataTable<TaxCategory>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/tax/categories/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No tax categories yet.</p>}
        columns={[
          { header: "Title", cell: (r) => <Link href={`/accounting/tax/categories/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.title}</Link> },
          { header: "Status", cell: (r) => <StatusPill status={r.disabled ? "Disabled" : "Active"} /> },
        ]}
      />
    </div>
  );
}

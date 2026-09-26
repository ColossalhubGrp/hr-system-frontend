import Link from "next/link";
import type { Route } from "next";
import { Percent, Plus, ChevronLeft, Star } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listPurchaseTaxTemplates, type PurchaseTaxTemplate } from "@/lib/frappe/tax/purchase-template";

export const metadata = { title: "Purchase Taxes Templates · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function PurchaseTaxTemplatesPage() {
  const rows = await listPurchaseTaxTemplates();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Percent}
        crumb="Accounting · Tax · Purchase Templates"
        title="Purchase Taxes and Charges Templates"
        subtitle={`${rows.length.toLocaleString()} templates — applied to Purchase Invoices, POs and RFQs.`}
        actions={
          <Link href={"/accounting/tax/purchase-templates/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New template
          </Link>
        }
      />
      <DataTable<PurchaseTaxTemplate>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/tax/purchase-templates/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No templates yet.</p>}
        columns={[
          {
            header: "Title",
            cell: (r) => (
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                {r.title}
                {r.isDefault && <Star className="h-3 w-3 text-primary" aria-label="Default" />}
              </span>
            ),
          },
          { header: "Company", cell: (r) => r.company },
          { header: "Status", cell: (r) => <StatusPill status={r.disabled ? "Disabled" : "Active"} /> },
        ]}
      />
    </div>
  );
}

import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import type { Route } from "next";
import { Layers, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listAccountingDimensions, type AccountingDimension } from "@/lib/frappe/masters/accounting-dimension";

export const metadata = { title: "Accounting Dimensions · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function DimensionsPage() {
  const rows = await listAccountingDimensions();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/masters/dimensions" />
      <PageHeader
        icon={Layers}
        crumb="Accounting · Masters · Accounting Dimensions"
        title="Accounting Dimensions"
        subtitle={`${rows.length.toLocaleString()} dimensions — extra tags (Branch, Project, Region) on ledger entries.`}
        actions={
          <Link href={"/accounting/masters/dimensions/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New dimension
          </Link>
        }
      />
      <DataTable<AccountingDimension>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/dimensions/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No dimensions yet.</p>}
        columns={[
          { header: "Label", cell: (r) => <Link href={`/accounting/masters/dimensions/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.label}</Link> },
          { header: "Backing record", cell: (r) => r.documentType },
          { header: "Fieldname", cell: (r) => <span className="font-mono text-xs">{r.fieldname}</span> },
          { header: "Status", cell: (r) => <StatusPill status={r.disabled ? "Disabled" : "Active"} /> },
        ]}
      />
    </div>
  );
}

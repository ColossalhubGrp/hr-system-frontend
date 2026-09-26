import Link from "next/link";
import type { Route } from "next";
import { Layers, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listSupplierGroups, type SupplierGroup } from "@/lib/frappe/buying/supplier-group";

export const metadata = { title: "Supplier Groups · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function SupplierGroupsPage() {
  const rows = await listSupplierGroups();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/buying" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Buying
        </Link>
      </div>
      <PageHeader
        icon={Layers}
        crumb="Buying · Supplier Groups"
        title="Supplier Groups"
        subtitle={`${rows.length.toLocaleString()} groups — used to bucket suppliers for reporting.`}
        actions={
          <Link href={"/buying/supplier-groups/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New group
          </Link>
        }
      />
      <DataTable<SupplierGroup>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/buying/supplier-groups/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No groups yet.</p>}
        columns={[
          { header: "Name", cell: (r) => <span className="font-semibold text-foreground">{r.supplierGroupName}</span> },
          { header: "Parent", cell: (r) => r.parent ?? "—" },
          { header: "Kind", cell: (r) => (r.isGroup ? "Group" : "Leaf") },
        ]}
      />
    </div>
  );
}

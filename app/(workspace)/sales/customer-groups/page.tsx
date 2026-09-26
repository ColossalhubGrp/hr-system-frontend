import Link from "next/link";
import type { Route } from "next";
import { Layers, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listCustomerGroups, type CustomerGroup } from "@/lib/frappe/sales/customer-group";

export const metadata = { title: "Customer Groups · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function CustomerGroupsPage() {
  const rows = await listCustomerGroups();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/sales" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Sales
        </Link>
      </div>
      <PageHeader
        icon={Layers}
        crumb="Sales · Customer Groups"
        title="Customer Groups"
        subtitle={`${rows.length.toLocaleString()} groups — used to bucket customers for reporting and pricing rules.`}
        actions={
          <Link href={"/sales/customer-groups/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New group
          </Link>
        }
      />
      <DataTable<CustomerGroup>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/sales/customer-groups/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No groups yet.</p>}
        columns={[
          { header: "Name", cell: (r) => <Link href={`/sales/customer-groups/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.customerGroupName}</Link> },
          { header: "Parent", cell: (r) => r.parent ?? "—" },
          { header: "Kind", cell: (r) => (r.isGroup ? "Group" : "Leaf") },
        ]}
      />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { Truck, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listSuppliersDirectory, type SupplierRow } from "@/lib/frappe/buying/supplier";

export const metadata = { title: "Suppliers · Buying · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const rows = await listSuppliersDirectory({ limit: 200 });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/buying" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Buying
        </Link>
      </div>
      <PageHeader
        icon={Truck}
        crumb="Buying · Suppliers"
        title="Suppliers"
        subtitle={`${rows.length.toLocaleString()} on the register.`}
        actions={
          <Link href={"/buying/suppliers/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New supplier
          </Link>
        }
      />
      <DataTable<SupplierRow>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/buying/suppliers/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Truck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No suppliers yet. Add your first one to unlock Purchase Invoice + Payments.</p>
          </div>
        }
        columns={[
          { header: "Name", cell: (r) => <Link href={`/buying/suppliers/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.supplierName}</Link> },
          { header: "Kind", cell: (r) => r.supplierType },
          { header: "Group", cell: (r) => r.supplierGroup ?? "—", className: "hidden md:table-cell" },
          { header: "Country", cell: (r) => r.country ?? "—", className: "hidden md:table-cell" },
          { header: "Currency", cell: (r) => <span className="font-mono text-xs">{r.defaultCurrency ?? "—"}</span> },
          { header: "Tax ID", cell: (r) => r.taxId ?? "—", className: "hidden lg:table-cell" },
        ]}
      />
    </div>
  );
}

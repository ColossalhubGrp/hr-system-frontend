import Link from "next/link";
import type { Route } from "next";
import { Package, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listItemsDirectory, type ItemRow } from "@/lib/frappe/item";

export const metadata = { title: "Items · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const rows = await listItemsDirectory({ limit: 300 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Package}
        crumb="Accounting · Items"
        title="Items"
        subtitle={`${rows.length.toLocaleString()} in the catalog.`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={"/accounting/items/groups" as Route}
              className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-input bg-transparent px-4 text-sm font-semibold hover:bg-muted/40"
            >
              Item Groups
            </Link>
            <Link
              href={"/accounting/items/new" as Route}
              className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
            >
              <Plus className="h-4 w-4" />
              New item
            </Link>
          </div>
        }
      />
      <DataTable<ItemRow>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/items/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No items yet. Add your first one so invoices have something to bill.
            </p>
          </div>
        }
        columns={[
          {
            header: "Code",
            cell: (r) => (
              <Link
                href={`/accounting/items/${encodeURIComponent(r.name)}` as Route}
                className="font-mono text-sm text-ink-800 underline-offset-4 hover:underline"
              >
                {r.itemCode}
              </Link>
            ),
          },
          { header: "Name", cell: (r) => <span className="font-semibold">{r.itemName}</span> },
          { header: "Group", cell: (r) => r.itemGroup ?? "—", className: "hidden md:table-cell" },
          { header: "UOM", cell: (r) => <span className="font-mono text-xs">{r.stockUom}</span>, className: "hidden md:table-cell" },
          {
            header: "Rate",
            cell: (r) => r.standardRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            className: "text-right tabular-nums",
          },
          {
            header: "Status",
            cell: (r) => <StatusPill status={r.disabled ? "Disabled" : "Active"} />,
          },
        ]}
      />
    </div>
  );
}

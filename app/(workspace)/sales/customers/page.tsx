import Link from "next/link";
import type { Route } from "next";
import { Users, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listCustomers, type CustomerRow } from "@/lib/frappe/sales/customer";

export const metadata = { title: "Customers · Sales · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const rows = await listCustomers({ limit: 200 });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/sales" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Sales
        </Link>
      </div>
      <PageHeader
        icon={Users}
        crumb="Sales · Customers"
        title="Customers"
        subtitle={`${rows.length.toLocaleString()} on the register.`}
        actions={
          <Link href={"/sales/customers/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New customer
          </Link>
        }
      />
      <DataTable<CustomerRow>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/sales/customers/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No customers yet. Add your first one to unlock Sales Invoice + Receipts.</p>
          </div>
        }
        columns={[
          { header: "Name", cell: (r) => <Link href={`/sales/customers/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.customerName}</Link> },
          { header: "Kind", cell: (r) => r.customerType },
          { header: "Group", cell: (r) => r.customerGroup ?? "—", className: "hidden md:table-cell" },
          { header: "Territory", cell: (r) => r.territory ?? "—", className: "hidden md:table-cell" },
          { header: "Currency", cell: (r) => <span className="font-mono text-xs">{r.defaultCurrency ?? "—"}</span> },
          { header: "Tax ID", cell: (r) => r.taxId ?? "—", className: "hidden lg:table-cell" },
        ]}
      />
    </div>
  );
}

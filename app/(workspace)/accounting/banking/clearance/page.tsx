import Link from "next/link";
import type { Route } from "next";
import { ArrowLeftRight, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listBankClearances, type BankClearance } from "@/lib/frappe/banking/bank-clearance";

export const metadata = { title: "Bank Clearance · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function BankClearancePage() {
  const rows = await listBankClearances();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={ArrowLeftRight}
        crumb="Accounting · Banking · Clearance"
        title="Bank Clearance"
        subtitle={`${rows.length.toLocaleString()} clearance batches. Marks cheques/transfers as cleared against the bank account.`}
        actions={
          <Link href={"/accounting/banking/clearance/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New batch
          </Link>
        }
      />
      <DataTable<BankClearance>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/banking/clearance/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No clearance batches yet.</p>}
        columns={[
          { header: "Batch", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "GL account", cell: (r) => r.account },
          { header: "Bank account", cell: (r) => r.bankAccount ?? "—" },
          { header: "From", cell: (r) => r.fromDate },
          { header: "To", cell: (r) => r.toDate },
          { header: "Status", cell: (r) => <StatusPill status={r.docstatus === 0 ? "Draft" : r.docstatus === 1 ? "Submitted" : "Cancelled"} /> },
        ]}
      />
    </div>
  );
}

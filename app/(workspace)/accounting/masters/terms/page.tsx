import Link from "next/link";
import type { Route } from "next";
import { ScrollText, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listTerms, type TermsAndConditions } from "@/lib/frappe/masters/terms-and-conditions";

export const metadata = { title: "Terms and Conditions · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const rows = await listTerms();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={ScrollText}
        crumb="Accounting · Masters · Terms and Conditions"
        title="Terms and Conditions"
        subtitle={`${rows.length.toLocaleString()} templates — reusable legal text for quotes, orders and invoices.`}
        actions={
          <Link
            href={"/accounting/masters/terms/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New template
          </Link>
        }
      />

      <DataTable<TermsAndConditions>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/terms/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ScrollText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No terms yet. Add one to print at the bottom of every invoice.</p>
          </div>
        }
        columns={[
          { header: "Title", cell: (r) => <Link href={`/accounting/masters/terms/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.title}</Link> },
          { header: "Status", cell: (r) => <StatusPill status={r.disabled ? "Disabled" : "Active"} /> },
          {
            header: "Last edited",
            cell: (r) => (r.modified ? new Date(r.modified).toLocaleDateString() : "—"),
            className: "hidden md:table-cell",
          },
        ]}
      />
    </div>
  );
}

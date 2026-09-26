import Link from "next/link";
import type { Route } from "next";
import { FileSpreadsheet, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listJournalTemplates, type JournalEntryTemplate } from "@/lib/frappe/masters/journal-entry-template";

export const metadata = { title: "Journal Entry Templates · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function JournalTemplatesPage() {
  const rows = await listJournalTemplates();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={FileSpreadsheet}
        crumb="Accounting · Masters · Journal Entry Templates"
        title="Journal Entry Templates"
        subtitle={`${rows.length.toLocaleString()} saved templates — pick one when creating a new journal to pre-fill the accounts grid.`}
        actions={
          <Link href={"/accounting/masters/journal-templates/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New template
          </Link>
        }
      />
      <DataTable<JournalEntryTemplate>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/journal-templates/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No templates yet.</p>}
        columns={[
          { header: "Title", cell: (r) => <Link href={`/accounting/masters/journal-templates/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.templateTitle}</Link> },
          { header: "Voucher type", cell: (r) => r.voucherType },
          { header: "Company", cell: (r) => r.company ?? "—" },
          {
            header: "Source",
            cell: (r) => (r.isSystemGenerated ? "System" : "User"),
            className: "hidden md:table-cell text-muted-foreground",
          },
        ]}
      />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { BookText, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listFinanceBooks, type FinanceBook } from "@/lib/frappe/masters/finance-book";

export const metadata = { title: "Finance Books · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function FinanceBooksPage() {
  const rows = await listFinanceBooks();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={BookText}
        crumb="Accounting · Masters · Finance Books"
        title="Finance Books"
        subtitle={`${rows.length.toLocaleString()} books — parallel ledgers (e.g. Statutory, Management).`}
        actions={
          <Link href={"/accounting/masters/finance-books/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New book
          </Link>
        }
      />
      <DataTable<FinanceBook>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/finance-books/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No finance books yet.</p>}
        columns={[{ header: "Name", cell: (r) => <Link href={`/accounting/masters/finance-books/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.financeBookName}</Link> }]}
      />
    </div>
  );
}

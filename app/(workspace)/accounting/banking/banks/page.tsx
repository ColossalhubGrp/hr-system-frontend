import Link from "next/link";
import type { Route } from "next";
import { Banknote, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listBanks, type Bank } from "@/lib/frappe/banking/bank";

export const metadata = { title: "Banks · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const rows = await listBanks();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Banknote}
        crumb="Accounting · Banking · Banks"
        title="Banks"
        subtitle={`${rows.length.toLocaleString()} banks (institutions). Bank accounts hold the account numbers.`}
        actions={
          <Link href={"/accounting/banking/banks/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New bank
          </Link>
        }
      />
      <DataTable<Bank>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/banking/banks/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No banks yet. Add CBZ, Steward, FBC, Stanbic, whichever you use.</p>}
        columns={[
          { header: "Bank", cell: (r) => <Link href={`/accounting/banking/banks/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.bankName}</Link> },
          { header: "SWIFT", cell: (r) => r.swiftNumber ?? "—", className: "font-mono text-xs" },
          { header: "Website", cell: (r) => r.website ?? "—" },
        ]}
      />
    </div>
  );
}

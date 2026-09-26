import Link from "next/link";
import type { Route } from "next";
import { Users, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listShareholders, type Shareholder } from "@/lib/frappe/shares/shareholder";

export const metadata = { title: "Shareholders · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function ShareholdersPage() {
  const rows = await listShareholders();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Users}
        crumb="Accounting · Shares · Shareholders"
        title="Shareholders"
        subtitle={`${rows.length.toLocaleString()} shareholders on the register.`}
        actions={
          <Link href={"/accounting/shares/shareholders/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New shareholder
          </Link>
        }
      />
      <DataTable<Shareholder>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/shares/shareholders/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No shareholders yet.</p>}
        columns={[
          { header: "Name", cell: (r) => <span className="font-semibold text-foreground">{r.title}</span> },
          { header: "Folio no.", cell: (r) => r.folioNo ?? "—" },
          { header: "Company", cell: (r) => r.company },
        ]}
      />
    </div>
  );
}

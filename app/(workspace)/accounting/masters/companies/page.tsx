import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import type { Route } from "next";
import { Building, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listCompanyMasters, type CompanyRow } from "@/lib/frappe/masters/company";

export const metadata = { title: "Companies · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const rows = await listCompanyMasters();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/masters/companies" />
      <PageHeader
        icon={Building}
        crumb="Accounting · Masters · Companies"
        title="Companies"
        subtitle={`${rows.length.toLocaleString()} entities in the group.`}
        actions={
          <Link href={"/accounting/masters/companies/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New company
          </Link>
        }
      />
      <DataTable<CompanyRow>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/companies/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No companies yet.</p>}
        columns={[
          { header: "Company", cell: (r) => <Link href={`/accounting/masters/companies/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.companyName}</Link> },
          { header: "Abbr", cell: (r) => <span className="font-mono text-xs">{r.abbr}</span> },
          { header: "Country", cell: (r) => r.country ?? "—" },
          { header: "Default currency", cell: (r) => <span className="font-mono text-xs">{r.defaultCurrency}</span> },
          { header: "Kind", cell: (r) => (r.isGroup ? "Group" : "Operating") },
        ]}
      />
    </div>
  );
}

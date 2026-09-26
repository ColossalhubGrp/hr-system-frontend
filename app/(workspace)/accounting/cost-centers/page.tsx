import Link from "next/link";
import type { Route } from "next";
import { Building2, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { listCostCenterTree } from "@/lib/frappe/cost-centers";
import { CostCenterTree } from "@/components/accounting/cost-center-tree";

export const metadata = { title: "Chart of Cost Centers · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string };

export default async function CostCentersPage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const roots = company ? await listCostCenterTree(company) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>

      <PageHeader
        icon={Building2}
        crumb="Accounting · Chart of Cost Centers"
        title="Chart of Cost Centers"
        subtitle="How this company slices the P&L — by branch, department or project."
        actions={<CompanyPicker companies={companies.map((c) => c.name)} active={company} />}
      />

      {!company ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No company set up yet.
        </div>
      ) : roots.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No cost centers yet for {company}.
        </div>
      ) : (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <CostCenterTree nodes={roots} company={company} />
        </section>
      )}
    </div>
  );
}

function CompanyPicker({ companies, active }: { companies: string[]; active: string }) {
  if (companies.length <= 1) return null;
  return (
    <form action="/accounting/cost-centers" className="flex items-center gap-2">
      <label htmlFor="company" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Company
      </label>
      <select
        id="company"
        name="company"
        defaultValue={active}
        className="h-9 rounded-chip border border-input bg-transparent px-2 text-sm focus-ring"
      >
        {companies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-chip border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted/40">
        Switch
      </button>
    </form>
  );
}

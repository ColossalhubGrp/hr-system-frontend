import Link from "next/link";
import type { Route } from "next";
import { Building2, ChevronLeft, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { listCostCenterTree, type CostCenterNode } from "@/lib/frappe/cost-centers";
import { CostCenterTree } from "@/components/accounting/cost-center-tree";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Chart of Cost Centers · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string };

export default async function CostCentersPage({ searchParams }: { searchParams: SP }) {
  // Catch at the page level so the actual backend message surfaces
  // in the UI. If this throws up to the workspace error.tsx, Next's
  // production build strips the message and the user is left staring
  // at "Server Components render" boilerplate.
  let companies: Awaited<ReturnType<typeof listCompanies>> = [];
  let roots: CostCenterNode[] = [];
  let error: string | null = null;
  try {
    companies = await listCompanies();
  } catch (e) {
    error = extract(e, "Could not load the company list.");
  }
  const company = searchParams.company || companies[0]?.name || "";
  if (company && !error) {
    try {
      roots = await listCostCenterTree(company);
    } catch (e) {
      error = extract(e, "Could not load the cost center tree.");
    }
  }

  function extract(e: unknown, fallback: string): string {
    if (e instanceof FrappeRequestError) return e.message || `Backend error (${e.status}).`;
    if (e instanceof Error) return e.message;
    return fallback;
  }

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
      ) : error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Couldn&apos;t load the cost center tree.</div>
            <div className="mt-1 text-destructive/80">{error}</div>
          </div>
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

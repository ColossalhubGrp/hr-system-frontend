import Link from "next/link";
import type { Route } from "next";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { listAccountTree, type AccountNode } from "@/lib/frappe/chart-of-accounts";
import { AccountTree } from "@/components/accounting/account-tree";

export const metadata = { title: "Chart of Accounts · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string };

const ROOT_ORDER: Array<AccountNode["rootType"]> = ["Asset", "Liability", "Equity", "Income", "Expense"];

const ROOT_LABEL: Record<string, string> = {
  Asset: "Assets",
  Liability: "Liabilities",
  Equity: "Equity",
  Income: "Income",
  Expense: "Expenses",
};

const ROOT_TONE: Record<string, string> = {
  Asset: "bg-rise/10 text-rise",
  Liability: "bg-fall/10 text-fall",
  Equity: "bg-primary/10 text-primary",
  Income: "bg-rise/10 text-rise",
  Expense: "bg-fall/10 text-fall",
};

export default async function ChartOfAccountsPage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const roots = company ? await listAccountTree(company) : [];

  const grouped = new Map<string, AccountNode[]>();
  for (const r of ROOT_ORDER) grouped.set(r ?? "", []);
  for (const root of roots) {
    const key = root.rootType ?? "";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(root);
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
        icon={Layers}
        crumb="Accounting · Chart of Accounts"
        title="Chart of Accounts"
        subtitle="The full ledger tree for this company — grouped by Assets, Liabilities, Equity, Income and Expenses."
        actions={
          <CompanyPicker companies={companies.map((c) => c.name)} active={company} />
        }
      />

      {!company ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No company set up yet. Create one under Masters → Company.
        </div>
      ) : roots.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No accounts found for {company}. Use the Chart of Accounts importer in Opening &amp; Closing to seed one.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {ROOT_ORDER.map((rt) => {
            const key = rt ?? "";
            const branch = grouped.get(key) ?? [];
            if (!branch.length) return null;
            return (
              <section key={key} className="rounded-2xl border border-border/60 bg-card p-4">
                <header className="mb-3 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{ROOT_LABEL[key] ?? key}</h2>
                    <p className="text-xs text-muted-foreground">
                      {branch.length} root{branch.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className={`rounded-chip px-2 py-0.5 text-[11px] font-semibold ${ROOT_TONE[key] ?? "bg-muted text-muted-foreground"}`}>
                    {key}
                  </span>
                </header>
                <AccountTree nodes={branch} company={company} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompanyPicker({ companies, active }: { companies: string[]; active: string }) {
  if (companies.length <= 1) return null;
  return (
    <form action="/accounting/chart-of-accounts" className="flex items-center gap-2">
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

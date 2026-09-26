import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getAccount } from "@/lib/frappe/chart-of-accounts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Account · Colossal HR` };
}

type SP = { company?: string };

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: { name: string };
  searchParams: SP;
}) {
  const name = decodeURIComponent(params.name);
  const account = await getAccount(name);
  if (!account) notFound();

  const back = searchParams.company
    ? `/accounting/chart-of-accounts?company=${encodeURIComponent(searchParams.company)}`
    : "/accounting/chart-of-accounts";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={back as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Chart of Accounts
        </Link>
      </div>

      <PageHeader
        icon={Layers}
        crumb={`Accounting · Chart of Accounts · ${account.accountName}`}
        title={account.accountName}
        subtitle={account.name}
      />

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Root type" value={account.rootType ?? "—"} />
          <Detail label="Account type" value={account.accountType ?? "—"} />
          <Detail label="Currency" value={account.currency ?? "—"} />
          <Detail label="Parent account" value={account.parent ?? "—"} />
          <Detail label="Is group" value={account.isGroup ? "Yes" : "No"} />
          <Detail label="Status" value={account.disabled ? "Disabled" : "Active"} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">Ledger view</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          For the running balance and each posting against this account, open the General Ledger report and filter to this account. That page is next in the roadmap.
        </p>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  );
}

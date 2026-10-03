import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Layers, ChevronLeft, ArrowRight, BookText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getAccount } from "@/lib/frappe/chart-of-accounts";
import { AccountActions } from "./account-actions";

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
        actions={<AccountActions account={account} backHref={back} />}
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

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BookText className="h-4 w-4 text-primary" />
              Every posting against this account
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The running balance and every debit / credit that has landed here —
              with the voucher that posted it, the party, and the amount — opens
              in the General Ledger pre-filtered to{" "}
              <span className="font-mono text-foreground">{account.name}</span>.
            </p>
          </div>
          <Link
            href={`/accounting/reports/general-ledger?account=${encodeURIComponent(account.name)}${searchParams.company ? `&company=${encodeURIComponent(searchParams.company)}` : ""}` as Route}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white hover:bg-ink-700"
          >
            Open ledger
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
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

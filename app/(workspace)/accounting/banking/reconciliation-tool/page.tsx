import Link from "next/link";
import type { Route } from "next";
import { ArrowLeftRight, ChevronLeft, Search, ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { listBankAccounts } from "@/lib/frappe/banking/bank-account";
import { listBankTransactions } from "@/lib/frappe/banking/bank-transaction";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Bank Reconciliation Tool · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { account?: string; from?: string; to?: string; status?: string };

const STATUSES = ["All", "Pending", "Reconciled", "Settled", "Unreconciled", "Cancelled"];

export default async function BankReconciliationToolPage({ searchParams }: { searchParams: SP }) {
  const banks = await listBankAccounts();
  const account = searchParams.account || banks[0]?.name || "";
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = searchParams.from || today.slice(0, 7) + "-01";
  const toDate = searchParams.to || today;
  const status = searchParams.status || "Pending";

  let rows: Awaited<ReturnType<typeof listBankTransactions>> = [];
  let error: string | null = null;
  if (account) {
    try {
      rows = await listBankTransactions({
        bankAccount: account,
        from: fromDate,
        to: toDate,
        status: status === "All" ? undefined : status,
      });
    } catch (e) {
      error =
        e instanceof FrappeRequestError
          ? e.message || `Backend error (${e.status})`
          : e instanceof Error
          ? e.message
          : "Could not fetch transactions.";
    }
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
        icon={ArrowLeftRight}
        crumb="Accounting · Banking · Reconciliation Tool"
        title="Bank Reconciliation Tool"
        subtitle="Match bank-statement lines to Payment / Journal Entries."
      />

      <form action="/accounting/banking/reconciliation-tool" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <FSel label="Bank account" name="account" value={account} options={banks.map((b) => b.name)} />
        <FDate label="From" name="from" value={fromDate} />
        <FDate label="To" name="to" value={toDate} />
        <FSel label="Status" name="status" value={status} options={STATUSES} />
        <button type="submit" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
          <Search className="h-3.5 w-3.5" />
          Load
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Nothing to reconcile in this range. Import bank statements via Bank Transaction (Desk) or Plaid to populate this list.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Ref</th>
                <th className="px-3 py-2 text-right">In</th>
                <th className="px-3 py-2 text-right">Out</th>
                <th className="px-3 py-2 text-right">Unallocated</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-border/30 last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{r.date}</td>
                  <td className="px-3 py-2">{r.description ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{r.referenceNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rise">
                    {r.deposit ? (
                      <span className="inline-flex items-center gap-1">
                        <ArrowDownToLine className="h-3 w-3" />
                        {r.deposit.toFixed(2)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-fall">
                    {r.withdrawal ? (
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpFromLine className="h-3 w-3" />
                        {r.withdrawal.toFixed(2)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.unallocatedAmount.toFixed(2)}</td>
                  <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                  <td className="px-3 py-2">
                    {r.status === "Pending" && r.unallocatedAmount > 0 && (
                      <Link
                        href={"/accounting/payment-entries/new" as Route}
                        className="inline-flex items-center gap-1 rounded-chip border border-input px-2 py-1 text-xs font-semibold hover:bg-muted/40"
                        title="Open a new Payment Entry — set the paid amount to this line's unallocated amount."
                      >
                        <Plus className="h-3 w-3" />
                        Create PE
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Bank Transactions are populated by Plaid link or by importing a bank statement in Desk (Bank Statement Import). Once a matching Payment Entry is submitted with the right amount + reference number, the transaction status flips to Reconciled automatically.
      </p>
    </div>
  );
}

function FSel({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select id={name} name={name} defaultValue={value} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FDate({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input id={name} name={name} type="date" defaultValue={value} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring" />
    </div>
  );
}

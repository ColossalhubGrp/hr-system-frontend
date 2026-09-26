import Link from "next/link";
import type { Route } from "next";
import { Wallet, Plus, ChevronLeft, Star } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listBankAccounts, type BankAccount } from "@/lib/frappe/banking/bank-account";

export const metadata = { title: "Bank Accounts · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const rows = await listBankAccounts();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Wallet}
        crumb="Accounting · Banking · Bank Accounts"
        title="Bank Accounts"
        subtitle={`${rows.length.toLocaleString()} accounts (company + customer + supplier).`}
        actions={
          <Link href={"/accounting/banking/accounts/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New account
          </Link>
        }
      />
      <DataTable<BankAccount>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/banking/accounts/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No bank accounts yet.</p>}
        columns={[
          {
            header: "Account",
            cell: (r) => (
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                {r.accountName}
                {r.isDefault && <Star className="h-3 w-3 text-primary" aria-label="Default" />}
              </span>
            ),
          },
          { header: "Bank", cell: (r) => r.bank },
          { header: "Type", cell: (r) => r.accountType ?? "—" },
          { header: "Account no.", cell: (r) => <span className="font-mono text-xs">{r.bankAccountNo ?? "—"}</span> },
          { header: "Kind", cell: (r) => (r.isCompanyAccount ? "Company" : "Party") },
          { header: "Status", cell: (r) => <StatusPill status={r.disabled ? "Disabled" : "Active"} /> },
        ]}
      />
    </div>
  );
}

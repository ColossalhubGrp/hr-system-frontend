import { Wallet, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listBanks } from "@/lib/frappe/banking/bank";
import { listCurrencies } from "@/lib/frappe/masters/company";
import { BankAccountForm } from "@/components/accounting/bank-account-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Bank Account · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewBankAccountPage() {
  const [companies, banks, currencies] = await Promise.all([listCompanies(), listBanks(), listCurrencies()]);
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/banking/accounts" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Bank Accounts
        </Link>
      </div>
      <PageHeader
        icon={Wallet}
        crumb="Accounting · Banking · Accounts · New"
        title="New Bank Account"
        subtitle="An account number at a bank — either company-owned (posts to GL) or party-owned."
      />
      <BankAccountForm
        mode="create"
        banks={banks.map((b) => b.name)}
        companies={companies.map((c) => ({ name: c.name }))}
        accounts={accounts}
        currencies={currencies}
      />
    </div>
  );
}

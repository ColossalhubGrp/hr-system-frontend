import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Wallet, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listBanks } from "@/lib/frappe/banking/bank";
import { listCurrencies } from "@/lib/frappe/masters/company";
import { getBankAccount } from "@/lib/frappe/banking/bank-account";
import { BankAccountForm } from "@/components/accounting/bank-account-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Bank Account · Colossal HR` };
}

export default async function EditBankAccountPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies, banks, currencies] = await Promise.all([
    getBankAccount(name),
    listCompanies(),
    listBanks(),
    listCurrencies(),
  ]);
  if (!doc) notFound();
  const firstCompany = doc.company || companies[0]?.name || "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 200 }) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/banking/accounts" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Bank Accounts
        </Link>
      </div>
      <PageHeader icon={Wallet} crumb={`Accounting · Banking · Accounts · ${doc.accountName}`} title={doc.accountName} subtitle={`${doc.bank}${doc.accountType ? ` · ${doc.accountType}` : ""}`} />
      <BankAccountForm
        mode="edit"
        name={doc.name}
        banks={banks.map((b) => b.name)}
        companies={companies.map((c) => ({ name: c.name }))}
        accounts={accounts}
        currencies={currencies}
        initial={doc}
      />
    </div>
  );
}

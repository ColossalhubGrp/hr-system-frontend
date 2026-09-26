import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Coins, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { getModeOfPayment } from "@/lib/frappe/masters/mode-of-payment";
import { ModeOfPaymentForm } from "@/components/accounting/mode-of-payment-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Mode of Payment · Colossal HR` };
}

export default async function EditModeOfPaymentPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getModeOfPayment(name), listCompanies()]);
  if (!doc) notFound();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/modes-of-payment" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Modes of Payment
        </Link>
      </div>
      <PageHeader
        icon={Coins}
        crumb={`Accounting · Masters · Modes of Payment · ${doc.modeOfPayment}`}
        title={doc.modeOfPayment}
        subtitle={`${doc.type} · ${doc.enabled ? "Enabled" : "Disabled"}`}
      />
      <ModeOfPaymentForm
        mode="edit"
        name={doc.name}
        companies={companies}
        accounts={accounts}
        initial={{
          modeOfPayment: doc.modeOfPayment,
          type: doc.type,
          enabled: doc.enabled,
          accounts: doc.accounts.map((a) => ({ company: a.company, default_account: a.defaultAccount })),
        }}
      />
    </div>
  );
}

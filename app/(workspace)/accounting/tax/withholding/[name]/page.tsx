import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { BadgeDollarSign, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { getTaxWithholding } from "@/lib/frappe/tax/withholding";
import { TaxWithholdingForm } from "@/components/accounting/tax-withholding-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Tax Withholding · Colossal HR` };
}

export default async function EditTaxWithholdingPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getTaxWithholding(name), listCompanies()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/withholding" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Tax Withholding
        </Link>
      </div>
      <PageHeader icon={BadgeDollarSign} crumb={`Accounting · Tax · Withholding · ${doc.category}`} title={doc.category} subtitle={`${doc.rates.length} rate periods · ${doc.accounts.length} company accounts`} />
      <TaxWithholdingForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        initial={{
          category: doc.category,
          roundOff: doc.roundOff,
          considerPartyLedgerAmount: doc.considerPartyLedgerAmount,
          rates: doc.rates.map((r) => ({ from_date: r.fromDate, to_date: r.toDate, tax_withholding_rate: String(r.taxWithholdingRate), single_threshold: String(r.singleThreshold), cumulative_threshold: String(r.cumulativeThreshold) })),
          accounts: doc.accounts.map((a) => ({ company: a.company, account: a.account })),
        }}
      />
    </div>
  );
}

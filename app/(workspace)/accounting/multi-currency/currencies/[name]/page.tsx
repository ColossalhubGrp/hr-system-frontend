import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Coins, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getCurrency } from "@/lib/frappe/multi-currency/currency";
import { CurrencyForm } from "@/components/accounting/currency-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Currency · Colossal HR` };
}

export default async function EditCurrencyPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getCurrency(name);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/multi-currency/currencies" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Currencies
        </Link>
      </div>
      <PageHeader icon={Coins} crumb={`Accounting · Multi-Currency · Currencies · ${doc.name}`} title={doc.currencyName} subtitle={`${doc.name}${doc.enabled ? "" : " · Disabled"}`} />
      <CurrencyForm mode="edit" name={doc.name} initial={doc} />
    </div>
  );
}

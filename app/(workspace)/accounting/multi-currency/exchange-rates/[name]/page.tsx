import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowRightLeft, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { getCurrencyExchange } from "@/lib/frappe/multi-currency/currency-exchange";
import { CurrencyExchangeForm } from "@/components/accounting/currency-exchange-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Exchange Rate · Colossal HR` };
}

export default async function EditExchangePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, currencies] = await Promise.all([getCurrencyExchange(name), listCurrencies()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/multi-currency/exchange-rates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Exchange Rates
        </Link>
      </div>
      <PageHeader icon={ArrowRightLeft} crumb={`Accounting · Multi-Currency · Exchange Rates · ${doc.name}`} title={`${doc.fromCurrency} → ${doc.toCurrency}`} subtitle={`${doc.date} @ ${doc.exchangeRate.toFixed(6)}`} />
      <CurrencyExchangeForm mode="edit" name={doc.name} currencies={currencies.map((c) => c.name)} defaultDate={doc.date} initial={doc} />
    </div>
  );
}

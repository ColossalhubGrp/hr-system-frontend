import { ArrowRightLeft, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { CurrencyExchangeForm } from "@/components/accounting/currency-exchange-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Exchange Rate · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewExchangePage() {
  const currencies = await listCurrencies();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/multi-currency/exchange-rates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Exchange Rates
        </Link>
      </div>
      <PageHeader
        icon={ArrowRightLeft}
        crumb="Accounting · Multi-Currency · Exchange Rates · New"
        title="New Exchange Rate"
        subtitle="One (from → to) rate on a date."
      />
      <CurrencyExchangeForm mode="create" currencies={currencies.filter((c) => c.enabled).map((c) => c.name)} defaultDate={today} />
    </div>
  );
}

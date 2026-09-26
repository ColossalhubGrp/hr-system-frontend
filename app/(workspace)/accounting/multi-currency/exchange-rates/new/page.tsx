import { ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { CurrencyExchangeForm } from "@/components/accounting/currency-exchange-form";

export const metadata = { title: "New Exchange Rate · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewExchangePage() {
  const currencies = await listCurrencies();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
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

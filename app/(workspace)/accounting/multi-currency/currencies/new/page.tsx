import { Coins, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { CurrencyForm } from "@/components/accounting/currency-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Currency · Colossal HR" };

export default function NewCurrencyPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/multi-currency/currencies" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Currencies
        </Link>
      </div>
      <PageHeader
        icon={Coins}
        crumb="Accounting · Multi-Currency · Currencies · New"
        title="New Currency"
        subtitle="Add a new currency code (name, symbol, fraction, number format)."
      />
      <CurrencyForm mode="create" />
    </div>
  );
}

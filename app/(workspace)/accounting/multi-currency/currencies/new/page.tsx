import { Coins } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { CurrencyForm } from "@/components/accounting/currency-form";

export const metadata = { title: "New Currency · Colossal HR" };

export default function NewCurrencyPage() {
  return (
    <div className="flex flex-col gap-5">
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

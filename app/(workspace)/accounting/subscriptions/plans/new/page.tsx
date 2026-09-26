import { Repeat } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { SubscriptionPlanForm } from "@/components/accounting/subscription-plan-form";

export const metadata = { title: "New Subscription Plan · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const currencies = await listCurrencies();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Repeat}
        crumb="Accounting · Subscriptions · Plans · New"
        title="New Subscription Plan"
        subtitle="A recurring priced offering."
      />
      <SubscriptionPlanForm mode="create" currencies={currencies.filter((c) => c.enabled).map((c) => c.name)} />
    </div>
  );
}

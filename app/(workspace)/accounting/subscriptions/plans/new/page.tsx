import { Repeat, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { SubscriptionPlanForm } from "@/components/accounting/subscription-plan-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Subscription Plan · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const currencies = await listCurrencies();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/subscriptions/plans" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Subscription Plans
        </Link>
      </div>
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

import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Repeat, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { getSubscriptionPlan } from "@/lib/frappe/subscriptions/plan";
import { SubscriptionPlanForm } from "@/components/accounting/subscription-plan-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Subscription Plan · Colossal HR` };
}

export default async function EditPlanPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, currencies] = await Promise.all([getSubscriptionPlan(name), listCurrencies()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/subscriptions/plans" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Subscription Plans
        </Link>
      </div>
      <PageHeader icon={Repeat} crumb={`Accounting · Subscriptions · Plans · ${doc.planName}`} title={doc.planName} subtitle={`${doc.currency} ${doc.cost.toFixed(2)} / ${doc.billingIntervalCount} ${doc.billingInterval.toLowerCase()}${doc.billingIntervalCount === 1 ? "" : "s"}`} />
      <SubscriptionPlanForm mode="edit" name={doc.name} currencies={currencies.map((c) => c.name)} initial={doc} />
    </div>
  );
}

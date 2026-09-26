import { Repeat, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { listSubscriptionPlans } from "@/lib/frappe/subscriptions/plan";
import { SubscriptionForm } from "@/components/accounting/subscription-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Subscription · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage() {
  const [companies, plans] = await Promise.all([listCompanies(), listSubscriptionPlans()]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/subscriptions" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Subscriptions
        </Link>
      </div>
      <PageHeader
        icon={Repeat}
        crumb="Accounting · Subscriptions · New"
        title="New Subscription"
        subtitle="Subscribe one party to one or more plans on a recurring schedule."
      />
      <SubscriptionForm
        mode="create"
        companies={companies.map((c) => c.name)}
        plans={plans.map((p) => p.name)}
        defaultDate={today}
      />
    </div>
  );
}

import { Repeat } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { listSubscriptionPlans } from "@/lib/frappe/subscriptions/plan";
import { SubscriptionForm } from "@/components/accounting/subscription-form";

export const metadata = { title: "New Subscription · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage() {
  const [companies, plans] = await Promise.all([listCompanies(), listSubscriptionPlans()]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
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

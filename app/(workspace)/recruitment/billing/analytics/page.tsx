import { BillingAnalyticsClient } from "@/components/recruitment/billing/billing-analytics-client";
import { fetchBillingAnalyticsForCurrentUser } from "@/lib/recruitment/server-billing";

export const metadata = { title: "Billing Analytics · Recruitment · Colossal HR" };

export default async function BillingAnalyticsPage() {
  const initial = await fetchBillingAnalyticsForCurrentUser();
  return (
    <BillingAnalyticsClient
      initial={initial}
      backHref="/recruitment/billing"
      showAllTime={true}
    />
  );
}

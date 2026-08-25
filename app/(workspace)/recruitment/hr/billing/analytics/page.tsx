import { BillingAnalyticsClient } from "@/components/recruitment/billing/billing-analytics-client";
import { fetchBillingAnalyticsForCurrentUser } from "@/lib/recruitment/server-billing";

export const metadata = { title: "HR Billing Analytics · Recruitment · Colossal HR" };

export default async function HrBillingAnalyticsPage() {
  const initial = await fetchBillingAnalyticsForCurrentUser();
  return (
    <BillingAnalyticsClient
      initial={initial}
      backHref="/recruitment/hr/billing"
      showAllTime={false}
    />
  );
}

import { BillingAnalyticsClient } from "@/components/recruitment/billing/billing-analytics-client";
import { fetchBillingAnalyticsForCurrentUser } from "@/lib/recruitment/server-billing";

export const metadata = { title: "Employer Billing Analytics · Recruitment · Colossal HR" };

export default async function EmployerBillingAnalyticsPage() {
  const initial = await fetchBillingAnalyticsForCurrentUser();
  return (
    <BillingAnalyticsClient
      initial={initial}
      backHref="/recruitment/employer/billing"
      showAllTime={true}
    />
  );
}

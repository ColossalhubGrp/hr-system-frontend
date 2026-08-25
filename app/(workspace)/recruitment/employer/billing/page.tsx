import { BillingClient } from "@/components/recruitment/billing/billing-client";
import { fetchBillingSummaryForCurrentUser } from "@/lib/recruitment/server-billing";

export const metadata = { title: "Employer Billing · Recruitment · Colossal HR" };

export default async function EmployerBillingPage() {
  const initial = await fetchBillingSummaryForCurrentUser();
  return <BillingClient initial={initial} analyticsHref="/recruitment/employer/billing/analytics" />;
}

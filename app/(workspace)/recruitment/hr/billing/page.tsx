import { BillingClient } from "@/components/recruitment/billing/billing-client";
import { fetchBillingSummaryForCurrentUser } from "@/lib/recruitment/server-billing";

export const metadata = { title: "HR Billing · Recruitment · Colossal HR" };

export default async function HrBillingPage() {
  const initial = await fetchBillingSummaryForCurrentUser();
  return <BillingClient initial={initial} analyticsHref="/recruitment/hr/billing/analytics" />;
}

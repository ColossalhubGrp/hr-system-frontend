import "server-only";

import { frappeCall } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";
import type {
  BillingAnalytics,
  BillingRange,
  BillingSummary,
} from "./api-client";

/**
 * Server-side initial fetch for the three billing pages
 * (/recruitment/billing, /recruitment/hr/billing,
 * /recruitment/employer/billing). Same Frappe method the client's
 * apiClient.getBillingSummary calls; forwarded with the caller's
 * sid + user_id cookies via frappeCall(as: "user") so DocPerms
 * apply exactly as through the BFF.
 *
 * Returns null on failure — the shared BillingClient handles the
 * null case (renders an empty state and lets the user retry).
 */
export async function fetchBillingSummaryForCurrentUser(): Promise<
  BillingSummary | null
> {
  const { userId } = readSession();
  if (!userId) return null;
  try {
    const res = await frappeCall<{ message?: BillingSummary } | BillingSummary>({
      method: "recruitment_app.api.billing_admin_api.get_billing_summary",
      args: { user: userId },
      as: "user",
    });
    // Frappe wraps whitelisted-method responses as { message: <payload> };
    // our frappeCall already unwraps that, but the underlying backend
    // sometimes returns the payload nested one more time. Handle both.
    if (
      res &&
      typeof res === "object" &&
      "message" in res &&
      (res as { message?: BillingSummary }).message
    ) {
      return (res as { message: BillingSummary }).message;
    }
    return res as BillingSummary;
  } catch (err) {
    console.error("[fetchBillingSummaryForCurrentUser] failed:", err);
    return null;
  }
}

/**
 * Server-side initial fetch for the three billing-analytics pages
 * (billing/analytics, hr/billing/analytics, employer/billing/analytics).
 * Mirrors apiClient.getBillingAnalytics — default range is "period"
 * (matches the client's default) so the first paint has the same
 * data the user's initial view would ask for.
 */
export async function fetchBillingAnalyticsForCurrentUser(
  range: BillingRange = "period",
): Promise<BillingAnalytics | null> {
  const { userId } = readSession();
  if (!userId) return null;
  try {
    const res = await frappeCall<
      { message?: BillingAnalytics } | BillingAnalytics
    >({
      method: "recruitment_app.api.billing_admin_api.get_billing_analytics",
      args: { user: userId, range },
      as: "user",
    });
    if (
      res &&
      typeof res === "object" &&
      "message" in res &&
      (res as { message?: BillingAnalytics }).message
    ) {
      return (res as { message: BillingAnalytics }).message;
    }
    return res as BillingAnalytics;
  } catch (err) {
    console.error("[fetchBillingAnalyticsForCurrentUser] failed:", err);
    return null;
  }
}

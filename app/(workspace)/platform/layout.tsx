import { redirect } from "next/navigation";

/**
 * Platform workspace (subscriptions / multi-tenant settings) is
 * Desk-only (2026-11-09, user decision): the platform operator manages
 * Company Subscription records in the Frappe Desk, never from this
 * app. Every /platform route redirects to the dashboard; the pages'
 * code stays intact so the surface can be restored by reverting this
 * layout and the nav-config entry.
 */
export default async function PlatformLayout(_props: {
  children: React.ReactNode;
}) {
  redirect("/dashboard");
}

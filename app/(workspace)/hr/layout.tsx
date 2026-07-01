import { requireGroup } from "@/lib/frappe/require-role";
import { requireApp } from "@/lib/subscriptions/gate";

/**
 * Gate the entire /hr/* area to anyone holding an HR-flavored role
 * (HR Manager / HR User / HR Officer / System Manager). Employees without
 * an HR role get redirected to /forbidden with their current role list.
 *
 * Note: this is the OUTER guard. Inner routes can tighten further (e.g. the
 * Appraisal Cycle framework editor calls `requireGroup("HR_ADMIN")`).
 */
export default async function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Subscription gate runs first — if the company hasn't subscribed
  // to HR, no role check helps. Defense in depth: middleware lets
  // anyone in, the layout gates.
  await requireApp("hr", "/hr");
  await requireGroup("HR_ANY", "/hr");
  return <>{children}</>;
}

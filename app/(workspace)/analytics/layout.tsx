import { requireGroup } from "@/lib/frappe/require-role";
import { requireApp } from "@/lib/subscriptions/gate";

/**
 * Analytics dashboard. Open to any Executive Viewer (read-only senior
 * perspective) — also reachable by HR Director / HR Manager / System Manager
 * via the EXECUTIVE_VIEWER bundle. Lives at workspace root, NOT under /hr/,
 * so an Executive-Viewer-only user isn't blocked by the broader HR_ANY guard.
 */
export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireApp("analytics", "/analytics");
  await requireGroup("EXECUTIVE_VIEWER", "/analytics");
  return <>{children}</>;
}

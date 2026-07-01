import { requireGroup } from "@/lib/frappe/require-role";
import { requireApp } from "@/lib/subscriptions/gate";

/**
 * The /team area is a Line Manager workspace — see + approve records for own
 * direct + indirect reports only. HR users have /employee + /hr/* instead.
 */
export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireApp("hr", "/team");
  await requireGroup("LINE_MANAGER", "/team");
  return <>{children}</>;
}

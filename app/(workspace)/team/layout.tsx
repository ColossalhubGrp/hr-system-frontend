import { requireGroup } from "@/lib/frappe/require-role";

/**
 * The /team area is a Line Manager workspace — see + approve records for own
 * direct + indirect reports only. HR users have /employee + /hr/* instead.
 */
export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("LINE_MANAGER", "/team");
  return <>{children}</>;
}

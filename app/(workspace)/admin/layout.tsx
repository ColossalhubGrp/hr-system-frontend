import { requireGroup } from "@/lib/frappe/require-role";

/**
 * Admin workspace — site Administrator (System Manager) only. Hosts
 * bench-wide plumbing like the reference-data manager. HR roles get
 * their own manageable settings under /settings/*; this surface is
 * for the platform operator (Frappe's Administrator user or anyone
 * carrying System Manager).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("PLATFORM_OPERATOR", "/admin");
  return <>{children}</>;
}

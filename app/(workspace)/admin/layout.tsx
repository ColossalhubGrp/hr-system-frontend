import { requireGroup } from "@/lib/frappe/require-role";

/**
 * Admin workspace — IT-admin + HR-admin only. Currently hosts the
 * reference-data manager; future entries (audit log viewer, user roles
 * picker, etc.) will live alongside it under /admin/*.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("HR_ADMIN", "/admin");
  return <>{children}</>;
}

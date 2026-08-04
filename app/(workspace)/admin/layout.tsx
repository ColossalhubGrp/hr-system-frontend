import { requireGroup } from "@/lib/frappe/require-role";

/**
 * Admin workspace — IT-admin + HR-admin. Hosts the reference-data
 * manager + future audit / IT tools. Individual pages can layer on
 * tighter gating (e.g. the references page hides platform-level
 * masters like AI Model Provider from anyone below PLATFORM_OPERATOR).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("HR_ADMIN", "/admin");
  return <>{children}</>;
}

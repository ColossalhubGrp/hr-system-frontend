import { requireGroup } from "@/lib/frappe/require-role";

export default async function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("AUDITOR", "/audit");
  return <>{children}</>;
}

import { requireGroup } from "@/lib/frappe/require-role";
import { requireApp } from "@/lib/subscriptions/gate";

export default async function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireApp("audit", "/audit");
  await requireGroup("AUDITOR", "/audit");
  return <>{children}</>;
}

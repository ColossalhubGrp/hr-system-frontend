import { redirect } from "next/navigation";
import { isInGroup, getMyRoles } from "@/lib/frappe/roles";

/**
 * Sales workspace — customers and, in future, quotes / sales orders.
 * Same access gate as /accounting for now (Accounts Manager / Finance
 * Reviewer / HR Director / System Manager); we can split into its own
 * role bundle later if the sales team wants tighter scoping.
 */
export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roles = await getMyRoles();
  if (!isInGroup(roles, "ACCOUNTING")) {
    redirect(`/forbidden?need=ACCOUNTING&from=${encodeURIComponent("/sales")}`);
  }
  return <>{children}</>;
}

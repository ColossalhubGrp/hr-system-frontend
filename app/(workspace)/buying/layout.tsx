import { redirect } from "next/navigation";
import { isInGroup, getMyRoles } from "@/lib/frappe/roles";

/**
 * Buying workspace — suppliers and, in future, RFQs / purchase orders.
 * Same access gate as /accounting for now.
 */
export default async function BuyingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roles = await getMyRoles();
  if (!isInGroup(roles, "ACCOUNTING")) {
    redirect(`/forbidden?need=ACCOUNTING&from=${encodeURIComponent("/buying")}`);
  }
  return <>{children}</>;
}

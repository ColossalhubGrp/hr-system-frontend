import { redirect } from "next/navigation";
import { isInGroup, getMyRoles } from "@/lib/frappe/roles";

/**
 * Accounting workspace — general ledger, journal entries, invoices,
 * reports. Backend is upstream ERPNext (installed on the same site);
 * we render the UI in the smart_hr_web design system.
 *
 * Access: ACCOUNTING role group (Accounts Manager / Accounts User /
 * Finance Reviewer / HR Director / System Manager). Individual sub-
 * routes may tighten further as we add write-heavy pages.
 */
export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roles = await getMyRoles();
  if (!isInGroup(roles, "ACCOUNTING")) {
    redirect(
      `/forbidden?need=ACCOUNTING&from=${encodeURIComponent("/accounting")}`,
    );
  }
  return <>{children}</>;
}

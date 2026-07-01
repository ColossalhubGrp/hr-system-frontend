import { redirect } from "next/navigation";
import { getMyAccess } from "@/lib/frappe/roles";
import { requireApp } from "@/lib/subscriptions/gate";
import { PayrollTabs } from "@/components/payroll/payroll-tabs";

/**
 * Payroll area is open to anyone who runs payroll (PAYROLL_ADMIN) OR anyone
 * who reviews it (PAYROLL_REVIEWER — Finance Reviewer + HR Director). Write
 * actions on individual pages still go through Frappe DocPerms server-side,
 * so a reviewer who reaches /payroll/structures can read but not create.
 */
export default async function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireApp("payroll", "/payroll");
  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isPayrollReviewer) {
    redirect(
      `/forbidden?need=PAYROLL_ADMIN&from=${encodeURIComponent("/payroll")}`,
    );
  }
  return (
    <>
      <PayrollTabs />
      {children}
    </>
  );
}

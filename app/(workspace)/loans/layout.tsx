import { requireGroup } from "@/lib/frappe/require-role";
import { requireApp } from "@/lib/subscriptions/gate";

/**
 * Loans area is HR-administered. SRS lists Loan management under HR scope
 * (US-15 onwards) — keep it behind an HR role. Pure Employees viewing their
 * own loan history would be a separate `/me/loans` surface in a later turn.
 */
export default async function LoansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireApp("loans", "/loans");
  await requireGroup("HR_ANY", "/loans");
  return <>{children}</>;
}

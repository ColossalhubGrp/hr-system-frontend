import { HandCoins } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

/**
 * Loans is marked COMING SOON (2026-11-02, user request): every /loans
 * route renders the branded coming-soon page instead of the module.
 * The module's pages and code underneath are intact — restore by
 * putting back the original layout body:
 *
 *   await requireApp("loans", "/loans");
 *   await requireGroup("HR_ANY", "/loans");
 *   return <>{children}</>;
 *
 * (imports: requireGroup from "@/lib/frappe/require-role",
 *  requireApp from "@/lib/subscriptions/gate")
 */
export default async function LoansLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ComingSoon
      icon={HandCoins}
      title="Loans"
      blurb="Staff loans from application to payout — approval steps, repayment schedules and automatic payroll deductions."
    />
  );
}

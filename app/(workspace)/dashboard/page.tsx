import { ExecDashboardGrid } from "@/components/dashboard/exec-dashboard-grid";
import { fetchExecSnapshot } from "@/lib/frappe/exec-snapshot";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Overall Dashboard" };

/**
 * The cross-module landing. Each section (People / Payroll /
 * Accounting / Recruitment) only loads + renders for users with
 * access to that module — a payroll officer sees Payroll tiles
 * but no Accounting panel; an exec with every bundle sees everything.
 *
 * /hr keeps its focused HR-only grid; this view is the "whole
 * company at a glance" page.
 */
export default async function OverallDashboardPage() {
  const access = await getMyAccess();
  const snapshot = await fetchExecSnapshot({
    hr: access.isHrAny || access.isExecutiveViewer || access.isPlatformOperator,
    payroll:
      access.isPayrollAny || access.isExecutiveViewer || access.isPlatformOperator,
    accounting:
      access.isAccountingAny || access.isExecutiveViewer || access.isPlatformOperator,
    recruitment:
      access.isRecruiter || access.isExecutiveViewer || access.isPlatformOperator,
  });
  return <ExecDashboardGrid title="Overall Dashboard" snapshot={snapshot} />;
}

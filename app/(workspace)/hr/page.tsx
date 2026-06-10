import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { fetchDashboardSnapshot } from "@/lib/frappe/queries";

export const metadata = { title: "HR Dashboard" };

/**
 * HR section landing. Currently mirrors the Overall dashboard data; per the
 * SRS roadmap (§10.1) this view will diverge to surface HR-specific cuts
 * (department drill-downs, leave coverage) when those metrics are exposed.
 */
export default async function HrDashboardPage() {
  const snapshot = await fetchDashboardSnapshot();
  return <DashboardGrid title="HR Dashboard" snapshot={snapshot} />;
}

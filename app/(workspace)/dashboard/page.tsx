import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { fetchDashboardSnapshot } from "@/lib/frappe/queries";

export const metadata = { title: "Overall Dashboard" };

export default async function OverallDashboardPage() {
  const snapshot = await fetchDashboardSnapshot();
  return <DashboardGrid title="Overall Dashboard" snapshot={snapshot} />;
}

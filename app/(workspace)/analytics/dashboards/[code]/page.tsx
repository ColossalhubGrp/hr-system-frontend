import type { Metadata } from "next";
import { DashboardDetail } from "@/components/analytics/dashboards/dashboard-detail";

export const metadata: Metadata = {
  title: "Dashboard · Analytics · Colossal Hub",
};

export default async function DashboardDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <DashboardDetail code={code} />;
}

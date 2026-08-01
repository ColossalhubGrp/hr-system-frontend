import type { Metadata } from "next";
import { DashboardsIndex } from "@/components/analytics/dashboards/dashboards-index";

export const metadata: Metadata = {
  title: "Dashboards · Analytics · Colossal HR",
};

export default function DashboardsIndexPage() {
  return <DashboardsIndex />;
}

import type { Metadata } from "next";
import { AnalyticsAsk } from "@/components/analytics/analytics-ask";

export const metadata: Metadata = {
  title: "Ask · Analytics · Colossal HR",
};

export default function AnalyticsAskPage() {
  return <AnalyticsAsk />;
}

import type { Metadata } from "next";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";

export const metadata: Metadata = {
  title: "Feed · Analytics · Colossal HR",
};

/**
 * Nao's Feed surface (team activity / shared updates) exposed as its
 * own outer-sidebar entry under Business Intelligence. Same SSO
 * bootstrap + embed-mode chrome overrides as Ask (AI) and Stories.
 */
export default function AnalyticsFeedPage() {
  return <NaoChatFrame naoPath="/feed" />;
}

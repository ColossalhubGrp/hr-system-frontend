import type { Metadata } from "next";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";

export const metadata: Metadata = {
  title: "Stories · Analytics · Colossal HR",
};

/**
 * Nao's Stories surface (saved / shareable analyses) exposed as its
 * own outer-sidebar entry under Business Intelligence. The iframe
 * targets /stories on the nao runtime; the same SSO bootstrap +
 * ?embed=1 chrome overrides apply.
 */
export default function AnalyticsStoriesPage() {
  return <NaoChatFrame naoPath="/stories" />;
}

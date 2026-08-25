import type { Metadata } from "next";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";

export const metadata: Metadata = {
  title: "AI Settings · Analytics · Colossal HR",
};

// Nao's settings surface (account / project / MCP / memory / experimental)
// exposed as a Colossal outer-nav entry. Embed mode hides nao's own sidebar,
// so this is the only way to reach the settings tabs. Landing on
// /settings/project/agent because that's where nao mounts the Experimental
// panel; the in-page sub-nav gets you to the other tabs from there.
export default function AnalyticsSettingsPage() {
  return <NaoChatFrame naoPath="/settings/project/agent" />;
}

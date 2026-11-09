import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";
import { readTenantSite } from "@/lib/frappe/tenant";

export const metadata: Metadata = {
  title: "AI Settings · Analytics · Colossal Hub",
};

// Nao's settings surface (account / project / MCP / memory / experimental)
// exposed as a Colossal outer-nav entry. Embed mode hides nao's own sidebar,
// so this is the only way to reach the settings tabs. Landing on
// /settings/project/agent because that's where nao mounts the Experimental
// panel; the in-page sub-nav gets you to the other tabs from there.
export default function AnalyticsSettingsPage() {
  // nao surfaces are control-site only for now: the SSO sidecar does
  // not recognise tenant sessions, so tenant users land on the
  // in-house Ask instead of a dead iframe.
  if (readTenantSite()) redirect("/analytics/ask");
  return <NaoChatFrame naoPath="/settings/project/agent" />;
}

import { SemanticsExplorer } from "@/components/analytics/semantics/semantics-explorer";

/**
 * Server component wrapper for the /analytics/semantics editor. Role
 * gating is handled by the parent `analytics/layout.tsx` (Executive
 * Viewer required). Fine-grained edit-vs-read rights are decided by
 * the backend `list_metrics()` endpoint and surfaced via the response
 * `editable` flag, so we don't duplicate role checks here.
 */

export const metadata = {
  title: "Semantics · Business Intelligence · Colossal HR",
};

export default function SemanticsPage() {
  return <SemanticsExplorer />;
}

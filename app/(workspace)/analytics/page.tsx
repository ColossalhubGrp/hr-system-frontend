import { redirect } from "next/navigation";

// /analytics no longer has its own landing surface — the AI chat
// (Ask) is the primary entry point. Left as a redirect so old
// bookmarks and cross-app links keep working.
export default function AnalyticsIndex() {
  redirect("/analytics/ask");
}

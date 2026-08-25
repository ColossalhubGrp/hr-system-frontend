/**
 * Server component shell for /recruitment/hr/jobs — proof-point for
 * migrating recruitment surfaces from "use client + useEffect +
 * apiClient" over to Server Components.
 *
 * The interactive core still lives client-side (dialogs, filters,
 * generate-with-AI flow, per-row delete), because those need local
 * state + mutations. What this shell does is fetch the initial job
 * list on the server via `fetchJobsForCurrentUser` and hand it in
 * as `initial` — so the browser gets real data on first paint, no
 * spinner, no client-side round-trip on load. Router Cache (see
 * next.config.mjs.staleTimes.dynamic) then makes same-user back-nav
 * within 60s instant, since the RSC payload already contains the
 * rendered rows.
 *
 * Mutations still route through apiClient (with the SWR read cache),
 * so create / edit / delete continue to work unchanged. Migrating
 * those to Server Actions is a separate step per page.
 */

import { JobsClient } from "@/components/recruitment/jobs/jobs-client";
import { fetchJobsForCurrentUser } from "@/lib/recruitment/server-jobs";

export const metadata = { title: "HR Jobs · Recruitment · Colossal HR" };

export default async function HrJobsPage() {
  const initial = await fetchJobsForCurrentUser();
  return <JobsClient initial={initial} />;
}

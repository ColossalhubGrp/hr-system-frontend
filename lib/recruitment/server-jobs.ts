import "server-only";

import { frappeCall } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";
import type { JobPosting } from "./types";

/**
 * Server-side fetch for the /recruitment/hr/jobs page's initial data.
 *
 * The recruitment surfaces were ported client-side (apiClient
 * + useEffect), so every visit spun a spinner and hit the BFF from
 * the browser. This helper is the first step of the incremental
 * migration to Server Components: the page's server component
 * awaits it during SSR, passes the result as `initial` to the
 * client component, and the browser sees real data in the first
 * paint — no spinner, no client-side round-trip on load.
 *
 * Same Frappe method the client's apiClient calls, forwarded with
 * the caller's sid + user_id cookies via frappeCall (as: "user"),
 * so DocPerms + permission_query_conditions apply exactly as they
 * would from the BFF. Returns [] on error rather than throwing —
 * the page still renders and the client component's own reload
 * path can retry.
 */
export async function fetchJobsForCurrentUser(
  status?: string,
): Promise<JobPosting[]> {
  const { userId } = readSession();
  if (!userId) return [];

  try {
    // Frappe wraps whitelisted-method responses as
    // `{ message: <payload> }` and our frappeCall unwraps `message`,
    // so `result` here is the payload the backend returns —
    // `{ data: JobPosting[], total: number }` for this method.
    const result = await frappeCall<{ data?: JobPosting[]; total?: number }>({
      method: "recruitment_app.api.job_postings.get_job_postings",
      args: {
        email: userId,
        status,
        limit_start: 0,
        limit_page_length: 99999,
      },
      as: "user",
    });
    return result?.data ?? [];
  } catch (err) {
    console.error("[fetchJobsForCurrentUser] failed:", err);
    return [];
  }
}

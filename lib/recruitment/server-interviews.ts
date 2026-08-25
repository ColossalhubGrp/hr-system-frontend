import "server-only";

import { frappeCall } from "@/lib/frappe/client";
import type { InterviewSession } from "./types";

/**
 * Server-side initial-payload fetch for /recruitment/interviewsreview.
 *
 * The client page paints its whole review grid off a single
 * getInterviewSessions call. Doing that server-side means the RSC
 * payload already carries the rendered rows — no spinner, no
 * useEffect round-trip on first mount. Uses frappeCall(as: "user")
 * so the caller's sid + user_id cookies flow through and DocPerms
 * apply exactly as they would from the BFF.
 *
 * Returns [] on failure — the client component still mounts and
 * can retry.
 */
export async function fetchInterviewsInitial(): Promise<InterviewSession[]> {
  try {
    const res = await frappeCall<{
      data?: InterviewSession[];
      total?: number;
    }>({
      method: "recruitment_app.api.interview_sessions.get_interview_sessions",
      args: { limit_start: 0, limit_page_length: 99999 },
      as: "user",
    });
    return res?.data ?? [];
  } catch (err) {
    console.error("[fetchInterviewsInitial] failed:", err);
    return [];
  }
}

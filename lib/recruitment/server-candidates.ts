import "server-only";

import { frappeCall } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";
import type { CandidateApplication, JobPosting } from "./types";

/**
 * Server-side initial-payload fetch for /recruitment/candidates.
 *
 * The page needs two lists: every job posting (for the "filter by
 * job" dropdown) and every candidate application (the table rows).
 * We fire both in parallel so first paint isn't the sum of two
 * sequential round-trips. Same DocPerm semantics as the BFF: the
 * caller's sid + user_id cookies are forwarded via
 * frappeCall(as: "user"), so a Recruiter sees only what a Recruiter
 * would see through the browser flow.
 *
 * Returns empty arrays on failure — the client component still
 * mounts and its own filter-change effects can retry.
 */
export async function fetchCandidatesInitial(): Promise<{
  jobs: JobPosting[];
  candidates: CandidateApplication[];
}> {
  const { userId } = readSession();
  if (!userId) return { jobs: [], candidates: [] };

  const jobsCall = frappeCall<{ data?: JobPosting[] }>({
    method: "recruitment_app.api.job_postings.get_job_postings",
    args: {
      email: userId,
      limit_start: 0,
      limit_page_length: 99999,
    },
    as: "user",
  }).catch((err) => {
    console.error("[fetchCandidatesInitial] jobs failed:", err);
    return { data: [] as JobPosting[] };
  });

  const candidatesCall = frappeCall<{ data?: CandidateApplication[] }>({
    method:
      "recruitment_app.api.candidate_applications.get_candidate_applications",
    args: {
      email: userId,
      limit_start: 0,
      limit_page_length: 99999,
    },
    as: "user",
  }).catch((err) => {
    console.error("[fetchCandidatesInitial] candidates failed:", err);
    return { data: [] as CandidateApplication[] };
  });

  const [jobsRes, candidatesRes] = await Promise.all([jobsCall, candidatesCall]);
  return {
    jobs: jobsRes?.data ?? [],
    candidates: candidatesRes?.data ?? [],
  };
}

/**
 * Server-side fetch for /recruitment/candidates/profile/[email].
 * The backend expects the caller's `email` (from the session) plus
 * a `candidate_email` (the subject of the profile). Returns null
 * when the caller isn't signed in OR the backend refuses; the
 * client component then falls back to its error path.
 */
export async function fetchCandidateProfile(
  candidateEmail: string,
): Promise<{ success?: boolean; error?: string } | null> {
  const { userId } = readSession();
  if (!userId) return null;
  try {
    const res = await frappeCall<any>({
      method: "recruitment_app.api.candidate_details.get_candidate_profile",
      args: { email: userId, candidate_email: candidateEmail },
      as: "user",
    });
    return res ?? null;
  } catch (err) {
    console.error("[fetchCandidateProfile] failed:", err);
    return null;
  }
}

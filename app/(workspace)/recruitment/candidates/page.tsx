/**
 * Server-side shell for /recruitment/candidates — same pattern as
 * /recruitment/hr/jobs. See fetchCandidatesInitial for why we fire
 * jobs + candidates in parallel here (both dropdowns / table need
 * data on first paint).
 */

import { CandidatesClient } from "@/components/recruitment/candidates/candidates-client";
import { fetchCandidatesInitial } from "@/lib/recruitment/server-candidates";

export const metadata = { title: "Candidates · Recruitment · Colossal HR" };

export default async function CandidatesPage() {
  const initial = await fetchCandidatesInitial();
  return <CandidatesClient initial={initial} />;
}

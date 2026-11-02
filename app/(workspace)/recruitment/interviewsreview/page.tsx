/**
 * Server-side shell for /recruitment/interviewsreview — same pattern
 * as /recruitment/hr/jobs and /recruitment/candidates.
 */

import { InterviewsReviewClient } from "@/components/recruitment/interviewsreview/interviews-review-client";
import { fetchInterviewsInitial } from "@/lib/recruitment/server-interviews";

export const metadata = {
  title: "Interview Reviews · Recruitment · Colossal Hub",
};

export default async function InterviewsReviewPage() {
  const initial = await fetchInterviewsInitial();
  return <InterviewsReviewClient initial={initial} />;
}

import { InterviewReportsClient } from "@/components/recruitment/interviewreports/interview-reports-client";
import { fetchInterviewsInitial } from "@/lib/recruitment/server-interviews";

export const metadata = { title: "Interview Reports · Recruitment · Colossal HR" };

export default async function InterviewReportsPage() {
  const initial = await fetchInterviewsInitial();
  return <InterviewReportsClient initial={initial} />;
}

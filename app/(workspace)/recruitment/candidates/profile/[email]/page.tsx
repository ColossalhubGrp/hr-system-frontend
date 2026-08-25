import { CandidateProfileClient } from "@/components/recruitment/candidates/candidate-profile-client";
import { fetchCandidateProfile } from "@/lib/recruitment/server-candidates";

export const metadata = { title: "Candidate Profile · Recruitment · Colossal HR" };

export default async function CandidateProfilePage({
  params,
}: {
  params: { email: string };
}) {
  const decodedEmail = decodeURIComponent(params.email);
  const initial = await fetchCandidateProfile(decodedEmail);
  return <CandidateProfileClient initial={initial} decodedEmail={decodedEmail} />;
}

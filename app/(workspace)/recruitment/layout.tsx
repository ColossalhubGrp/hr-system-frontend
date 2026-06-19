import { requireGroup } from "@/lib/frappe/require-role";

/**
 * Recruitment workspace — everything copied verbatim from the standalone
 * recruitment-platform-frontend, gated on the RECRUITER bundle. Candidate
 * and Employer personas still get their own sub-trees here (per the
 * "open inside the main app" requirement) but those would normally be
 * served via a different sign-in flow.
 */
export default async function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("RECRUITER", "/recruitment");
  return <>{children}</>;
}

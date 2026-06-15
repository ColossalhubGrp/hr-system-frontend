import { redirect } from "next/navigation";
import { getMyAccess } from "@/lib/frappe/roles";

/**
 * Root landing: HR-flavored users go straight to the admin dashboard;
 * regular employees land on their self-service `/me` workspace. Anonymous
 * users get pulled to `/login` by the middleware first.
 */
export default async function RootPage(): Promise<never> {
  const access = await getMyAccess();
  // Alumni-only sessions are walled off from the rest of the workspace and
  // get their own portal at /alumni. They never see /me, /dashboard, etc.
  if (access.isAlumniOnly) redirect("/alumni");
  redirect(access.isHrAny ? "/dashboard" : "/me");
}

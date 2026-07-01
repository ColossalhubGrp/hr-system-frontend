import { redirect } from "next/navigation";
import { getMyAccess } from "@/lib/frappe/roles";

/**
 * Platform workspace — for the SITE Administrator (System Manager) who
 * runs the multi-tenant deployment, NOT for per-company HR/IT admins.
 *
 *   /platform/subscriptions — which apps each company has bought
 *   /platform/...           — future platform-level surfaces
 *
 * Gated on the raw "System Manager" role (not HR_ADMIN), because HR
 * Director / HR Manager / IT Admin are customers, not the platform
 * operator. The site operator can choose not to be a System Manager on
 * any tenant, but the role implies "owns this site".
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getMyAccess();
  if (!access.roles.has("System Manager")) {
    redirect("/forbidden?reason=platform&from=/platform");
  }
  return <>{children}</>;
}

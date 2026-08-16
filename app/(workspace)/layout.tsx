import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";
import { isAuthenticated, readSession, resolveAvatarUrl } from "@/lib/frappe/session";
import { getMyAccess } from "@/lib/frappe/roles";
import { getMySubscription } from "@/lib/subscriptions/server";

/**
 * Workspace shell: full-height purple rail on the left, scrollable canvas on
 * the right with the topbar floating in. We deliberately don't put the topbar
 * inside the scroll container so the search/notif stay pinned. The Sidebar is
 * filtered server-side by the signed-in user's role bundle.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware redirects when `sid` is missing, but a stale or non-Guest sid
  // can sneak through — double-check at the layout boundary.
  if (!isAuthenticated()) {
    redirect("/login");
  }

  const session = readSession();
  const [access, subscription] = await Promise.all([
    getMyAccess(),
    getMySubscription(),
  ]);

  // App codes the user's company is subscribed to. Always-on apps (core)
  // are forced in even when the catalog query failed entirely.
  const subscribedApps = new Set<string>([
    "core",
    ...subscription.apps.filter((a) => a.enabled).map((a) => a.code),
  ]);

  // Alumni-only sessions have their own walled-garden portal and never see
  // the HR workspace shell.
  if (access.isAlumniOnly) {
    redirect("/alumni");
  }
  const user = {
    name: session.fullName ?? session.userId ?? "Signed in",
    email: session.userId ?? undefined,
    avatarUrl: resolveAvatarUrl(session.avatarUrl) ?? undefined,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <Sidebar
        access={{
          isHrAdmin: access.isHrAdmin,
          isHrAny: access.isHrAny,
          isPayrollAdmin: access.isPayrollAdmin,
          isPayrollReviewer: access.isPayrollReviewer,
          isPayrollAny: access.isPayrollAny,
          isShiftAdmin: access.isShiftAdmin,
          isLineManager: access.isLineManager,
          isRecruiter: access.isRecruiter,
          isExecutiveViewer: access.isExecutiveViewer,
          isAuditor: access.isAuditor,
          isDataSteward: access.isDataSteward,
          isItAdmin: access.isItAdmin,
          isSettingsAny: access.isSettingsAny,
          isPlatformOperator: access.isPlatformOperator,
          isEmployee: access.isEmployee,
          subscribedApps,
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} notifications={0} />
        <main className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

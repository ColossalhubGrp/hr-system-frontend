import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { isAuthenticated, readSession, resolveAvatarUrl } from "@/lib/frappe/session";

/**
 * Workspace shell: full-height purple rail on the left, scrollable canvas on
 * the right with the topbar floating in. We deliberately don't put the topbar
 * inside the scroll container so the search/notif stay pinned.
 */
export default function WorkspaceLayout({
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
  const user = {
    name: session.fullName ?? session.userId ?? "Signed in",
    email: session.userId ?? undefined,
    avatarUrl: resolveAvatarUrl(session.avatarUrl) ?? undefined,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} notifications={0} />
        <main className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}

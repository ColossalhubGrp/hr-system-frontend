import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { isAuthenticated, readSession, resolveAvatarUrl } from "@/lib/frappe/session";
import { getMyAccess } from "@/lib/frappe/roles";
import { BrandMark } from "@/components/layout/brand-mark";
import { alumniLogoutAction } from "@/app/alumni/login/actions";

/**
 * Alumni portal. A walled-garden for ex-employees:
 *  - the only role they hold is `Alumni`
 *  - they see their own historical Employee record + final salary slips
 *  - they cannot access /me, /hr/*, /employee/* etc.
 *
 * Anyone with active workforce roles (HR, Employee, etc.) gets bounced back
 * to the main app so e.g. an HR consultant who also has the Alumni role still
 * sees the full workspace.
 */
export default async function AlumniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthenticated()) {
    redirect("/alumni/login");
  }

  const access = await getMyAccess();
  // Non-alumni-only users go to the main app. If you somehow land at /alumni
  // without the Alumni role at all, send to /forbidden.
  if (!access.isAlumniOnly) {
    if (!access.roles.has("Alumni")) {
      redirect("/forbidden?need=ALUMNI_ONLY&from=%2Falumni");
    }
    redirect("/");
  }

  const session = readSession();
  const fullName = session.fullName ?? session.userId ?? "Alumnus";
  const avatar = resolveAvatarUrl(session.avatarUrl);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href={"/alumni" as Route} className="flex items-center gap-3">
            <BrandMark className="h-8 w-8" />
            <span className="text-sm font-semibold tracking-tight text-ink-900">
              Colossal HR · Alumni
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {avatar && (
              <img
                src={avatar}
                alt=""
                className="h-7 w-7 rounded-full border border-hairline object-cover"
              />
            )}
            <div className="hidden text-right sm:block">
              <div className="font-medium text-ink-800">{fullName}</div>
              <div className="text-xs text-ash-500">{session.userId}</div>
            </div>
            <form action={alumniLogoutAction}>
              <button
                type="submit"
                className="rounded-chip border border-hairline px-3 py-1.5 text-xs font-medium text-ash-700 hover:bg-canvas focus-ring"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

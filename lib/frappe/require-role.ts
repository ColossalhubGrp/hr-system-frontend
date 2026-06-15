import "server-only";
import { redirect } from "next/navigation";
import { ROLE_GROUPS, getMyAccess, hasAnyRole, type RoleGroup } from "./roles";

/**
 * Server-side guard for Server Components. Call at the top of any page that
 * requires a role bundle. Redirects to `/forbidden?from=<route>` when the
 * signed-in user doesn't have any of the required roles.
 *
 *   await requireGroup("HR_ADMIN", "/hr/performance/cycles/.../framework");
 *
 * The `from` param is used by the Forbidden page to render a back link.
 */
export async function requireGroup(
  group: RoleGroup,
  fromPath?: string,
): Promise<void> {
  const access = await getMyAccess();
  if (hasAnyRole(access.roles, ROLE_GROUPS[group])) return;
  const url = fromPath
    ? `/forbidden?from=${encodeURIComponent(fromPath)}&need=${encodeURIComponent(group)}`
    : `/forbidden?need=${encodeURIComponent(group)}`;
  redirect(url);
}

/** Same idea, but checks against an arbitrary role list. */
export async function requireAnyRole(
  roles: readonly string[],
  fromPath?: string,
): Promise<void> {
  const access = await getMyAccess();
  if (hasAnyRole(access.roles, roles)) return;
  const url = fromPath
    ? `/forbidden?from=${encodeURIComponent(fromPath)}`
    : "/forbidden";
  redirect(url);
}

import Link from "next/link";
import type { Route } from "next";
import { Users as UsersIcon, ChevronLeft } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { ROLE } from "@/lib/frappe/roles";
import { requireGroup } from "@/lib/frappe/require-role";
import { EditRolesDrawer } from "@/components/settings/edit-roles-drawer";

export const metadata = { title: "Users & Roles · Colossal HR" };

type UserRow = {
  name: string;
  full_name: string | null;
  user_type: string | null;
  last_login: string | null;
  roles: string[];
};

type UserRoleMap = { users: UserRow[] };
type AllRolesResp = { roles: Array<{ name: string }> };

// The SRS personas (+ Frappe-native equivalents the system also uses). We
// drive the role-edit drawer with this list and also use it for the per-role
// occupancy table at the top of the page.
const SRS_ROLES = [
  ROLE.HR_DIRECTOR,
  ROLE.HR_MANAGER,
  ROLE.HR_OPERATIONS,
  ROLE.HR_USER,
  ROLE.HR_OFFICER,
  ROLE.RECRUITER,
  ROLE.HIRING_MANAGER,
  ROLE.LINE_MANAGER,
  ROLE.EMPLOYEE,
  ROLE.PAYROLL_OFFICER,
  ROLE.FINANCE_REVIEWER,
  ROLE.EXECUTIVE_VIEWER,
  ROLE.DATA_STEWARD,
  ROLE.IT_ADMIN,
  ROLE.AUDITOR,
  ROLE.ALUMNI,
];

export default async function UsersAndRolesPage() {
  // Even though /settings/layout.tsx allows the broader SETTINGS_ANY bundle,
  // user + role administration is strictly an IT Admin / System Manager
  // concern. HR Directors who type the URL directly land on /forbidden.
  await requireGroup("IT_ADMIN", "/settings/users");
  // Two parallel reads: the user→roles map (for the table) and the full role
  // catalog (for the drawer checkboxes — includes any custom roles too).
  const [usersResp, rolesResp] = await Promise.all([
    frappeCall<UserRoleMap>({
      method: "recruitment_app.api.me.user_role_map",
      as: "user",
    }).catch(() => ({ users: [] }) as UserRoleMap),
    frappeCall<AllRolesResp>({
      method: "recruitment_app.api.me.list_all_roles",
      as: "user",
    }).catch(() => ({ roles: [] }) as AllRolesResp),
  ]);

  const users = usersResp.users;
  // Show SRS roles first, then any non-SRS-but-still-assignable roles after.
  const srsSet = new Set<string>(SRS_ROLES);
  const otherRoles = rolesResp.roles
    .map((r) => r.name)
    .filter((n) => !srsSet.has(n));
  const drawerRoles = [...SRS_ROLES, ...otherRoles];

  // Per-role occupancy for the top summary row.
  const byRole = new Map<string, string[]>();
  for (const r of SRS_ROLES) byRole.set(r, []);
  for (const u of users) {
    for (const role of u.roles) {
      const arr = byRole.get(role);
      if (arr) arr.push(u.name);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={"/settings" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to settings
        </Link>
        <header className="mt-3 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <UsersIcon className="h-3.5 w-3.5" />
            Settings · Users & Roles
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Users & role assignments
          </h1>
          <p className="text-sm text-ash-600">
            {users.length} enabled accounts. Click <strong>Edit</strong> on any
            row to change role membership — changes take effect immediately,
            with DocPerms enforced server-side.
          </p>
        </header>
      </div>

      {/* Per-role occupancy */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ash-500">
          Role occupancy
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SRS_ROLES.map((role) => {
            const ids = byRole.get(role) ?? [];
            return (
              <div
                key={role}
                className="flex items-center justify-between rounded-card border border-hairline bg-surface px-3 py-2 text-sm shadow-card"
              >
                <span className="font-medium text-ink-800">{role}</span>
                <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
                  {ids.length}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-user table */}
      <section className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">User</th>
              <th className="px-4 py-2.5 text-left font-medium">Roles</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-ash-500"
                >
                  No users found. Provisioning may not be complete.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.name} className="hover:bg-canvas/40">
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-ink-800">
                    {u.full_name ?? u.name}
                  </div>
                  <div className="text-xs text-ash-500">{u.name}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 ? (
                      <span className="text-xs italic text-ash-500">
                        No roles assigned
                      </span>
                    ) : (
                      u.roles.map((r) => (
                        <span
                          key={r}
                          className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800"
                        >
                          {r}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <EditRolesDrawer
                    userEmail={u.name}
                    fullName={u.full_name}
                    current={u.roles}
                    available={drawerRoles}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

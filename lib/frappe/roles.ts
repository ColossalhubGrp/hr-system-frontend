import "server-only";
import { frappeCall } from "./client";
import { readSession } from "./session";

/**
 * Roles named in SRS §3.2.2, all provisioned as Frappe Roles via the
 * setup_srs_roles bootstrap. The four Frappe-shipped roles we keep
 * (HR Manager, HR User, HR Officer, Employee, System Manager, Accounts
 * Manager, Accounts User) compose with the SRS personas inside the
 * ROLE_GROUPS table — so the data layer (DocPerms) is authoritative
 * and the route layer just asks "is the user in group X?".
 */
export const ROLE = {
  // --- Frappe-native (kept for backwards compatibility with seed data) ---
  HR_MANAGER: "HR Manager",
  HR_USER: "HR User",
  HR_OFFICER: "HR Officer",
  EMPLOYEE: "Employee",
  SYSTEM_MANAGER: "System Manager",
  ACCOUNTS_MANAGER: "Accounts Manager",
  ACCOUNTS_USER: "Accounts User",

  // --- SRS personas (provisioned, with DocPerms) ---
  HR_DIRECTOR: "HR Director",
  HR_OPERATIONS: "HR Operations",
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager",
  LINE_MANAGER: "Line Manager",
  PAYROLL_OFFICER: "Payroll Officer",
  FINANCE_REVIEWER: "Finance Reviewer",
  EXECUTIVE_VIEWER: "Executive Viewer",
  DATA_STEWARD: "Data Steward",
  IT_ADMIN: "IT Admin",
  AUDITOR: "Auditor",
  ALUMNI: "Alumni",
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE] | (string & {});

/**
 * Named groups of roles for permission checks. Each route in the workspace
 * asks "is the signed-in user in group X?" — never "is the user role-name
 * exactly Y?". Adding a new role (or a custom one) is a one-line change here.
 *
 * The hierarchy roughly tracks SRS §3.2.2:
 *  - HR Director > HR Manager > HR Operations > HR User / HR Officer
 *  - Payroll Officer ↔ Finance Reviewer ↔ Accounts Manager
 *  - IT Admin ↔ System Manager
 *  - Auditor is read-only and orthogonal
 *  - Alumni is post-exit, own-only, gets its OWN portal at /alumni
 */
export const ROLE_GROUPS = {
  /** Top-of-the-pyramid HR admins. Can edit appraisal cycles, policies, etc. */
  HR_ADMIN: [
    ROLE.HR_DIRECTOR,
    ROLE.HR_MANAGER,
    ROLE.SYSTEM_MANAGER,
    ROLE.IT_ADMIN,
  ],

  /** Anyone with HR operations access (read most things, edit some). */
  HR_ANY: [
    ROLE.HR_DIRECTOR,
    ROLE.HR_MANAGER,
    ROLE.HR_OPERATIONS,
    ROLE.HR_USER,
    ROLE.HR_OFFICER,
    ROLE.SYSTEM_MANAGER,
  ],

  /** Anyone who can run payroll. */
  PAYROLL_ADMIN: [
    ROLE.HR_DIRECTOR,
    ROLE.PAYROLL_OFFICER,
    ROLE.HR_MANAGER,
    ROLE.ACCOUNTS_MANAGER,
    ROLE.SYSTEM_MANAGER,
  ],

  /** Reviewers who can sign off but not initiate payroll. */
  PAYROLL_REVIEWER: [
    ROLE.FINANCE_REVIEWER,
    ROLE.HR_DIRECTOR,
    ROLE.SYSTEM_MANAGER,
  ],

  /** Union of payroll admin + reviewer — anyone allowed to even see the
   *  payroll area. Sub-routes still tighten via PAYROLL_ADMIN /
   *  PAYROLL_REVIEWER as needed. */
  PAYROLL_ANY: [
    ROLE.PAYROLL_OFFICER,
    ROLE.FINANCE_REVIEWER,
    ROLE.HR_DIRECTOR,
    ROLE.HR_MANAGER,
    ROLE.ACCOUNTS_MANAGER,
    ROLE.SYSTEM_MANAGER,
  ],

  /** Anyone who can manage shift schedules + location restrictions. */
  SHIFT_ADMIN: [
    ROLE.HR_DIRECTOR,
    ROLE.HR_MANAGER,
    ROLE.HR_OPERATIONS,
    ROLE.HR_USER,
    ROLE.SYSTEM_MANAGER,
  ],

  /** People who manage a direct-report team (approve their team's leave/goals). */
  LINE_MANAGER: [ROLE.LINE_MANAGER],

  /** Recruitment pipeline access. */
  RECRUITER: [ROLE.RECRUITER, ROLE.HIRING_MANAGER, ROLE.HR_MANAGER, ROLE.HR_DIRECTOR, ROLE.SYSTEM_MANAGER],

  /** Read-only dashboards for executives. */
  EXECUTIVE_VIEWER: [
    ROLE.EXECUTIVE_VIEWER,
    ROLE.HR_DIRECTOR,
    ROLE.SYSTEM_MANAGER,
  ],

  /** Read-only audit + compliance access. */
  AUDITOR: [ROLE.AUDITOR, ROLE.HR_DIRECTOR, ROLE.SYSTEM_MANAGER],

  /** Defines + owns metric definitions and reference data. */
  DATA_STEWARD: [
    ROLE.DATA_STEWARD,
    ROLE.HR_DIRECTOR,
    ROLE.SYSTEM_MANAGER,
  ],

  /** System administration (custom fields, roles, users, workflow). */
  IT_ADMIN: [ROLE.IT_ADMIN, ROLE.SYSTEM_MANAGER],

  /**
   * Anyone who can SEE the /settings area. HR-policy settings (performance
   * framework default, overtime rules, leave policies) need HR_ADMIN; system
   * settings (users / roles / permissions) need IT_ADMIN. The shared
   * landing page filters cards by which sub-pages the user can actually use.
   */
  SETTINGS_ANY: [
    ROLE.HR_DIRECTOR,
    ROLE.HR_MANAGER,
    ROLE.HR_OPERATIONS,
    ROLE.IT_ADMIN,
    ROLE.SYSTEM_MANAGER,
  ],

  /** Post-exit alumni — see their own historical records only. */
  ALUMNI_ONLY: [ROLE.ALUMNI],

  /** The minimum role for any signed-in workforce member. */
  EMPLOYEE_ANY: [
    ROLE.EMPLOYEE,
    ROLE.HR_DIRECTOR,
    ROLE.HR_MANAGER,
    ROLE.HR_OPERATIONS,
    ROLE.HR_USER,
    ROLE.HR_OFFICER,
    ROLE.LINE_MANAGER,
    ROLE.PAYROLL_OFFICER,
    ROLE.FINANCE_REVIEWER,
    ROLE.EXECUTIVE_VIEWER,
    ROLE.DATA_STEWARD,
    ROLE.IT_ADMIN,
    ROLE.AUDITOR,
    ROLE.SYSTEM_MANAGER,
  ],
} as const;

export type RoleGroup = keyof typeof ROLE_GROUPS;

type MyRolesResponse = { user: string; roles: string[] };

/**
 * Cache per-request so multiple components can call this without piling on
 * Frappe round-trips. Server Components run fresh on every request, so this
 * lives at module level but the cookie is read each time — the underlying
 * call is keyed by sid.
 */
let cached: { sid: string; roles: Set<string> } | null = null;

/**
 * Read the signed-in user's roles from Frappe. Returns an empty set for
 * unauthenticated requests (including Guest). The first call per request
 * fetches; subsequent calls reuse the cached set.
 */
export async function getMyRoles(): Promise<Set<string>> {
  const session = readSession();
  if (!session.sid || !session.userId) return new Set();

  if (cached && cached.sid === session.sid) return cached.roles;

  try {
    // Frappe's REST does not return child rows on User (frappe.client.get
    // strips `roles`), and `Has Role` isn't queryable via get_list. So we
    // expose a small whitelisted method in recruitment_app that returns
    // `frappe.session.user`'s roles, and call it as the user (their sid is
    // the source of truth — we don't trust the user_id cookie alone).
    const resp = await frappeCall<MyRolesResponse>({
      method: "recruitment_app.api.me.my_roles",
      as: "user",
    });
    const roles = new Set((resp.roles ?? []).filter(Boolean));
    cached = { sid: session.sid, roles };
    return roles;
  } catch {
    return new Set();
  }
}

/** True if the user has ANY of the given roles. */
export function hasAnyRole(
  myRoles: ReadonlySet<string>,
  required: readonly string[],
): boolean {
  for (const r of required) if (myRoles.has(r)) return true;
  return false;
}

/** Convenience: belongs to a named role group. */
export function isInGroup(
  myRoles: ReadonlySet<string>,
  group: RoleGroup,
): boolean {
  return hasAnyRole(myRoles, ROLE_GROUPS[group]);
}

/**
 * Shape returned by `getMyAccess` — what every page asks for once and then
 * branches on. Pages that need exact role-by-role checks can also call
 * `getMyRoles()` directly.
 */
export type MyAccess = {
  roles: Set<string>;

  isHrAdmin: boolean;
  isHrAny: boolean;

  isPayrollAdmin: boolean;
  isPayrollReviewer: boolean;
  isPayrollAny: boolean;

  isShiftAdmin: boolean;

  /** Manages a direct-report team — sees own team's records only. */
  isLineManager: boolean;
  /** Has access to the recruitment pipeline. */
  isRecruiter: boolean;
  /** Sees the org-wide executive dashboards. */
  isExecutiveViewer: boolean;
  /** Read-only audit + compliance access. */
  isAuditor: boolean;
  /** Owns metric definitions + reference data taxonomies. */
  isDataSteward: boolean;
  /** System administration (custom fields, roles, users). */
  isItAdmin: boolean;
  /** Can reach the /settings area at all — cards filter further inside. */
  isSettingsAny: boolean;

  /** Post-exit alumni — only role they have (UI routes to /alumni). */
  isAlumniOnly: boolean;

  isEmployee: boolean;
};

export async function getMyAccess(): Promise<MyAccess> {
  const roles = await getMyRoles();

  // Alumni-only means: has the Alumni role AND no other "active workforce"
  // role. An ex-employee who is now an HR consultant (hypothetically) would
  // not be alumni-only.
  const isAlumni = roles.has(ROLE.ALUMNI);
  const activeWorkforce =
    isInGroup(roles, "HR_ANY") ||
    isInGroup(roles, "PAYROLL_ADMIN") ||
    isInGroup(roles, "PAYROLL_REVIEWER") ||
    isInGroup(roles, "LINE_MANAGER") ||
    isInGroup(roles, "RECRUITER") ||
    isInGroup(roles, "EXECUTIVE_VIEWER") ||
    isInGroup(roles, "AUDITOR") ||
    isInGroup(roles, "DATA_STEWARD") ||
    isInGroup(roles, "IT_ADMIN") ||
    roles.has(ROLE.EMPLOYEE);

  return {
    roles,
    isHrAdmin: isInGroup(roles, "HR_ADMIN"),
    isHrAny: isInGroup(roles, "HR_ANY"),
    isPayrollAdmin: isInGroup(roles, "PAYROLL_ADMIN"),
    isPayrollReviewer: isInGroup(roles, "PAYROLL_REVIEWER"),
    isPayrollAny: isInGroup(roles, "PAYROLL_ANY"),
    isShiftAdmin: isInGroup(roles, "SHIFT_ADMIN"),
    isLineManager: isInGroup(roles, "LINE_MANAGER"),
    isRecruiter: isInGroup(roles, "RECRUITER"),
    isExecutiveViewer: isInGroup(roles, "EXECUTIVE_VIEWER"),
    isAuditor: isInGroup(roles, "AUDITOR"),
    isDataSteward: isInGroup(roles, "DATA_STEWARD"),
    isItAdmin: isInGroup(roles, "IT_ADMIN"),
    isSettingsAny: isInGroup(roles, "SETTINGS_ANY"),
    isAlumniOnly: isAlumni && !activeWorkforce,
    isEmployee: isInGroup(roles, "EMPLOYEE_ANY"),
  };
}

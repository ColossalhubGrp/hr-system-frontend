import "server-only";
import { frappeCall } from "./client";
import { readSession } from "./session";

/**
 * Line Manager team-scoping.
 *
 * A Line Manager is allowed to see + approve records for their *direct and
 * indirect reports* — never the whole company. Frappe's row-level perms are
 * the authoritative layer (DocPerms grant read; the manager-of-record check
 * happens server-side at write time). This helper drives the UI side:
 *
 *   - "/team" directory lists exactly the team set
 *   - "/team/leave" filters Leave Applications by employee ∈ team
 *   - "/team/goals" filters Goals by employee ∈ team
 *
 * The team set is computed by BFS-ing the Employee.reports_to graph downward
 * from the signed-in user's Employee record. We cap recursion depth and total
 * size as a safety net — real org trees rarely go past 8 levels or 1000 reports.
 */

const MAX_DEPTH = 12;
const MAX_TEAM_SIZE = 2000;

type EmployeeRow = { name: string; reports_to?: string | null };

let teamCache: { sid: string; rootEmpId: string | null; teamIds: string[] } | null = null;

/**
 * Returns the Employee.name of the signed-in user, or null if the user has no
 * linked Employee record. Cached per-request keyed by sid.
 */
async function resolveSelfEmployee(): Promise<string | null> {
  const session = readSession();
  if (!session.sid || !session.userId) return null;

  const rows = await frappeCall<Array<{ name: string }>>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee",
      filters: JSON.stringify([["user_id", "=", session.userId]]),
      fields: ["name"],
      limit_page_length: 1,
    },
    as: "user",
  });
  return rows[0]?.name ?? null;
}

/**
 * BFS down the `reports_to` graph starting from the signed-in user's Employee
 * record. Returns the full team set INCLUDING the manager themselves (so
 * "manager sees own goals" works without a special case).
 *
 * Returns [] for a non-manager (their own employee id is included; downstream
 * filters degenerate to "only me" which is also correct — but the canonical
 * use site is /team/*, gated by LINE_MANAGER, so this rarely happens).
 */
export async function getMyTeamEmployeeIds(): Promise<string[]> {
  const session = readSession();
  if (!session.sid) return [];

  // Per-request cache. Server Components re-import on each request, so the
  // module-level cache keys by sid; once the team is resolved for this sid,
  // subsequent calls within the same render return instantly.
  if (teamCache && teamCache.sid === session.sid) return teamCache.teamIds;

  const root = await resolveSelfEmployee();
  if (!root) {
    teamCache = { sid: session.sid, rootEmpId: null, teamIds: [] };
    return [];
  }

  const seen = new Set<string>([root]);
  let frontier: string[] = [root];

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (frontier.length === 0) break;
    if (seen.size >= MAX_TEAM_SIZE) break;

    const reports = await frappeCall<EmployeeRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        filters: JSON.stringify([["reports_to", "in", frontier]]),
        fields: ["name", "reports_to"],
        limit_page_length: 500,
      },
      as: "user",
    }).catch(() => [] as EmployeeRow[]);

    const next: string[] = [];
    for (const r of reports) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        next.push(r.name);
        if (seen.size >= MAX_TEAM_SIZE) break;
      }
    }
    frontier = next;
  }

  const teamIds = [...seen];
  teamCache = { sid: session.sid, rootEmpId: root, teamIds };
  return teamIds;
}

/**
 * Same as getMyTeamEmployeeIds but excludes the manager themselves — useful
 * for "pending approvals on my team" views where surfacing the manager's own
 * record would be self-approval noise.
 */
export async function getMyDirectAndIndirectReports(): Promise<string[]> {
  const all = await getMyTeamEmployeeIds();
  const session = readSession();
  if (!session.userId) return all;

  // Find the root employee id (the manager themselves) and drop it.
  const myEmpRows = await frappeCall<Array<{ name: string }>>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee",
      filters: JSON.stringify([["user_id", "=", session.userId]]),
      fields: ["name"],
      limit_page_length: 1,
    },
    as: "user",
  }).catch(() => [] as Array<{ name: string }>);
  const myEmpId = myEmpRows[0]?.name;
  if (!myEmpId) return all;
  return all.filter((id) => id !== myEmpId);
}

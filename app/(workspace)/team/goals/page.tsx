import Link from "next/link";
import type { Route } from "next";
import { Target } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { getMyDirectAndIndirectReports } from "@/lib/frappe/team-scope";

export const metadata = { title: "Team goals · Colossal HR" };

type GoalRow = {
  name: string;
  goal_name: string | null;
  employee: string | null;
  employee_name: string | null;
  status: string | null;
  progress: number | null;
  appraisal_cycle: string | null;
};

export default async function TeamGoalsPage() {
  const teamEmps = await getMyDirectAndIndirectReports();

  const rows = teamEmps.length
    ? await frappeCall<GoalRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Goal",
          filters: JSON.stringify([["employee", "in", teamEmps]]),
          fields: [
            "name",
            "goal_name",
            "employee",
            "employee_name",
            "status",
            "progress",
            "appraisal_cycle",
          ],
          order_by: "modified desc",
          limit_page_length: 100,
        },
        as: "user",
      }).catch(() => [] as GoalRow[])
    : [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Target className="h-3.5 w-3.5" />
          My Team · Goals
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Team goals
        </h1>
        <p className="text-sm text-ash-600">
          {rows.length === 0
            ? teamEmps.length === 0
              ? "You don't have any direct or indirect reports yet."
              : "No goals set for your team yet."
            : `${rows.length} goal${rows.length === 1 ? "" : "s"} across ${teamEmps.length} team member${teamEmps.length === 1 ? "" : "s"}.`}
        </p>
      </header>

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Goal</th>
                <th className="px-4 py-2.5 text-left font-medium">Employee</th>
                <th className="px-4 py-2.5 text-left font-medium">Cycle</th>
                <th className="px-4 py-2.5 text-left font-medium">Progress</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => {
                const pct = Math.max(0, Math.min(100, Number(r.progress ?? 0)));
                return (
                  <tr key={r.name} className="hover:bg-canvas/40">
                    <td className="px-4 py-3 font-medium text-ink-800">
                      <Link
                        href={`/hr/performance/goals/${encodeURIComponent(r.name)}` as Route}
                        className="hover:underline"
                      >
                        {r.goal_name ?? r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ash-700">
                      {r.employee_name ?? r.employee ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ash-700">
                      {r.appraisal_cycle ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-canvas">
                          <div
                            className="h-full bg-ink-800"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-ash-600">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ash-700">{r.status ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

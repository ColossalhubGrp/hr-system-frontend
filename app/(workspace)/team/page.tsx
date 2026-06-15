import Link from "next/link";
import type { Route } from "next";
import { Users } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { getMyTeamEmployeeIds } from "@/lib/frappe/team-scope";

export const metadata = { title: "My Team · Colossal HR" };

type TeamRow = {
  name: string;
  employee_name: string | null;
  designation: string | null;
  department: string | null;
  status: string | null;
  user_id: string | null;
  reports_to: string | null;
};

export default async function MyTeamPage() {
  const teamIds = await getMyTeamEmployeeIds();
  // Filter myself out for the directory view — the manager isn't part of
  // their own team in this UI.
  const reportIds = teamIds.length > 1 ? teamIds.slice(1) : teamIds;

  const rows = reportIds.length
    ? await frappeCall<TeamRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Employee",
          filters: JSON.stringify([["name", "in", reportIds]]),
          fields: ["name", "employee_name", "department", "status", "user_id", "reports_to"],
          order_by: "employee_name asc",
          limit_page_length: 200,
        },
        as: "user",
      }).catch(() => [] as TeamRow[])
    : [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Users className="h-3.5 w-3.5" />
          My Team · Directory
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          My team
        </h1>
        <p className="text-sm text-ash-600">
          {rows.length} {rows.length === 1 ? "person" : "people"} reporting into
          you, directly or indirectly.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Department</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Reports to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.name} className="hover:bg-canvas/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/employee/${encodeURIComponent(r.name)}` as Route}
                      className="font-medium text-ink-800 hover:underline"
                    >
                      {r.employee_name ?? r.name}
                    </Link>
                    <div className="text-xs text-ash-500">{r.name}</div>
                  </td>
                  <td className="px-4 py-3 text-ash-700">{r.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill value={r.status ?? "Active"} />
                  </td>
                  <td className="px-4 py-3 text-ash-700">{r.reports_to ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "Active"
      ? "bg-rise/10 text-rise"
      : value === "Left"
        ? "bg-fall/10 text-fall"
        : "bg-amber-100/60 text-amber-800";
  return (
    <span className={`inline-flex rounded-chip px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {value}
    </span>
  );
}

function EmptyState() {
  return (
    <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-600">
      No direct or indirect reports linked to your Employee record yet. If
      that's a mistake, ask HR to set <code>reports_to</code> on the team
      members' Employee records.
    </p>
  );
}

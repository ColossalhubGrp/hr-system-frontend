import { Plane } from "lucide-react";
import { LeavesTable } from "@/components/leaves/leaves-table";
import { fetchLeaves } from "@/lib/frappe/leaves";
import { getMyDirectAndIndirectReports } from "@/lib/frappe/team-scope";

export const metadata = { title: "Team leave · Colossal HR" };

type SP = { status?: string };

export default async function TeamLeavePage({
  searchParams,
}: {
  searchParams: SP;
}) {
  // Default to Open (pending) so the page surfaces what the manager needs to
  // act on first; managers can switch via the status param.
  const status = searchParams.status ?? "Open";
  const teamEmps = await getMyDirectAndIndirectReports();
  const result = await fetchLeaves({
    employees: teamEmps,
    status: status === "All" ? undefined : status,
    page: 1,
    pageSize: 50,
  });

  const pending = result.rows.filter((r) => r.status === "Open").length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Plane className="h-3.5 w-3.5" />
          My Team · Leave
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Team leave applications
        </h1>
        <p className="text-sm text-ash-600">
          {teamEmps.length === 0
            ? "You don't have any direct or indirect reports yet."
            : `${pending} pending across ${teamEmps.length} team member${teamEmps.length === 1 ? "" : "s"}.`}
        </p>
      </header>

      <div className="flex gap-2 text-xs">
        {(["Open", "Approved", "Rejected", "All"] as const).map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`rounded-chip border px-3 py-1.5 font-medium ${
              status === s
                ? "border-ink-800 bg-ink-800 text-white"
                : "border-hairline text-ash-700 hover:bg-canvas"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <LeavesTable rows={result.rows} />
    </div>
  );
}

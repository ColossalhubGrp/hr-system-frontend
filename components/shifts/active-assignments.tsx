import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import type { ShiftAssignment } from "@/lib/frappe/shifts";

export function ActiveAssignmentsTable({
  rows,
}: {
  rows: ShiftAssignment[];
}) {
  if (rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-card border border-dashed border-hairline bg-surface py-12 text-sm text-ash-500">
        No active shift assignments today.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
            <th className="px-5 py-3">Employee</th>
            <th className="px-5 py-3">Shift</th>
            <th className="px-5 py-3 hidden md:table-cell">Start</th>
            <th className="px-5 py-3 hidden md:table-cell">End</th>
            <th className="px-2 py-3" aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr
              key={a.id}
              className="border-b border-hairline last:border-b-0 transition hover:bg-canvas/60"
            >
              <td className="px-5 py-3">
                <Link
                  href={
                    `/employee/${encodeURIComponent(a.employee)}` as Route
                  }
                  className="flex flex-col gap-0.5 focus-ring rounded-xl"
                >
                  <span className="font-medium text-ash-900">
                    {a.employeeName ?? a.employee}
                  </span>
                  <span className="text-xs text-ash-500">{a.employee}</span>
                </Link>
              </td>
              <td className="px-5 py-3 text-ash-800">{a.shiftType}</td>
              <td className="px-5 py-3 hidden md:table-cell text-ash-700">
                {fmtDate(a.startDate)}
              </td>
              <td className="px-5 py-3 hidden md:table-cell text-ash-700">
                {a.endDate ? fmtDate(a.endDate) : "Ongoing"}
              </td>
              <td className="px-2 py-3 text-right text-ash-400">
                <ChevronRight className="ml-auto h-4 w-4" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

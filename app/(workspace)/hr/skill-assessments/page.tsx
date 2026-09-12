import Link from "next/link";
import type { Route } from "next";
import { Gauge, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { FilterRow } from "@/components/common/list-shell";
import { listSkillAssessments } from "@/lib/frappe/lifecycle-ext";

export const metadata = { title: "Skill assessments · Colossal HR" };

type SP = { employee?: string; skill?: string };

export default async function SkillAssessmentsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const rows = await listSkillAssessments({
    employee: searchParams.employee || undefined,
    skill: searchParams.skill || undefined,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Gauge}
        crumb="HR · Skill Assessments"
        title="Skill assessments"
        subtitle={`${rows.length.toLocaleString()} assessment${rows.length === 1 ? "" : "s"} on file. Snapshots per employee per skill, dated so growth can be tracked over time.`}
        actions={
          <Link
            href={"/hr/skill-assessments/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            Log assessment
          </Link>
        }
      />

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        empty="No assessments match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => <EmployeeCell id={r.employee} name={r.employeeName} />,
          },
          { header: "Skill", cell: (r) => r.skill },
          {
            header: "Proficiency",
            className: "text-right",
            cell: (r) => (
              <span className="inline-flex h-6 w-16 items-center justify-center rounded-full bg-ink-50 text-xs font-semibold text-ink-800">
                {r.proficiency.toFixed(1)} / 5
              </span>
            ),
          },
          {
            header: "Date",
            className: "text-ash-700",
            cell: (r) => fmtDate(r.assessmentDate),
          },
          {
            header: "Notes",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.notes ?? "—",
          },
        ]}
      />
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

import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listDesignations } from "@/lib/frappe/setup-designations";
import { DesignationDeleteButton } from "@/components/setup/designation-delete-button";
import { deleteDesignationAction } from "./actions";

export const metadata = {
  title: "Designations · Configuration · Colossal HR",
};

export default async function DesignationsPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/designations"),
    );
  }

  const rows = await listDesignations();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Configuration
      </Link>

      <PageHeader
        icon={BadgeCheck}
        crumb="Configuration · HR policy · Designations"
        title="Designations"
        subtitle="Job titles employees hold. Each carries a required-skills list that anchors appraisal skill-maps and interview scoring."
        actions={
          <Link
            href={"/settings/designations/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New designation
          </Link>
        }
      />

      <section className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ash-500">
            No designations yet. Create one to start assigning employees.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5">Designation</th>
                <th className="px-4 py-2.5 text-right">Required skills</th>
                <th className="px-4 py-2.5 text-right">Assigned employees</th>
                <th className="px-4 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/settings/designations/${encodeURIComponent(r.name)}` as Route
                      }
                      className="group flex flex-col focus-ring rounded-md"
                    >
                      <span className="font-medium text-ink-800 group-hover:underline">
                        {r.name}
                      </span>
                      {r.description && (
                        <span className="text-xs text-ash-500 line-clamp-2">
                          {r.description}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-ash-700">
                    {r.skillsCount}
                  </td>
                  <td className="px-4 py-3 text-right text-ash-700">
                    {r.employeeCount === 0 ? (
                      <span className="text-ash-400">—</span>
                    ) : (
                      r.employeeCount
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={
                          `/settings/designations/${encodeURIComponent(r.name)}` as Route
                        }
                        className="rounded-md p-1.5 text-ash-500 transition hover:bg-canvas hover:text-ash-800 focus-ring"
                        title="Edit designation"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <DesignationDeleteButton
                        name={r.name}
                        disabled={r.employeeCount > 0}
                        action={deleteDesignationAction}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

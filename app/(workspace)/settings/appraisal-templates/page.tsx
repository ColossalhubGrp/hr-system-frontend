import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listAppraisalTemplates } from "@/lib/frappe/setup-appraisal-templates";
import { TemplateDeleteButton } from "@/components/setup/template-delete-button";
import { deleteAppraisalTemplateAction } from "./actions";

export const metadata = {
  title: "Appraisal templates · Settings · Colossal HR",
};

export default async function AppraisalTemplatesPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/appraisal-templates"),
    );
  }

  const rows = await listAppraisalTemplates();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Workspace settings
      </Link>

      <PageHeader
        icon={ClipboardList}
        crumb="Settings · HR policy · Appraisal templates"
        title="Appraisal templates"
        subtitle="Rating criteria + weightages a cycle uses when it opens appraisals. Feedback forms auto-populate from these — set once, inherit everywhere."
        actions={
          <Link
            href={"/settings/appraisal-templates/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New template
          </Link>
        }
      />

      <section className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ash-500">
            No templates yet. Create one to define standard rating criteria
            for cycles.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5">Template</th>
                <th className="px-4 py-2.5 text-right">Criteria</th>
                <th className="px-4 py-2.5 text-right">Used by cycles</th>
                <th className="px-4 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/settings/appraisal-templates/${encodeURIComponent(r.name)}` as Route
                      }
                      className="group flex flex-col focus-ring rounded-md"
                    >
                      <span className="font-medium text-ink-800 group-hover:underline">
                        {r.name}
                      </span>
                      {r.description && (
                        <span className="text-xs text-ash-500">
                          {r.description}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-ash-700">
                    {r.criteriaCount}
                  </td>
                  <td className="px-4 py-3 text-right text-ash-700">
                    {r.usedByCycles === 0 ? (
                      <span className="text-ash-400">—</span>
                    ) : (
                      `${r.usedByCycles} cycle${r.usedByCycles === 1 ? "" : "s"}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={
                          `/settings/appraisal-templates/${encodeURIComponent(r.name)}` as Route
                        }
                        className="rounded-md p-1.5 text-ash-500 transition hover:bg-canvas hover:text-ash-800 focus-ring"
                        title="Edit template"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <TemplateDeleteButton
                        name={r.name}
                        disabled={r.usedByCycles > 0}
                        action={deleteAppraisalTemplateAction}
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

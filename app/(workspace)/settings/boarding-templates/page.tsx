import Link from "next/link";
import type { Route } from "next";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SubTabs } from "@/components/common/sub-tabs";
import { DataTable } from "@/components/common/data-table";
import {
  listOnboardingTemplates,
  listSeparationTemplates,
} from "@/lib/frappe/lifecycle-ext";

export const metadata = { title: "Boarding templates · Colossal HR" };

type SP = { kind?: string };

export default async function BoardingTemplatesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const kind: "onboarding" | "separation" =
    searchParams.kind === "separation" ? "separation" : "onboarding";
  const rows =
    kind === "onboarding"
      ? await listOnboardingTemplates()
      : await listSeparationTemplates();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={ClipboardList}
        crumb="Configuration · Boarding templates"
        title="Boarding templates"
        subtitle="Reusable Onboarding and Separation activity checklists — pick one when creating an Onboarding or Separation record to auto-fill the tasks."
        actions={
          <Link
            href={`/settings/boarding-templates/new?kind=${kind}` as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New template
          </Link>
        }
      />

      <SubTabs
        tabs={[
          { id: "onboarding", label: "Onboarding" },
          { id: "separation", label: "Separation" },
        ]}
        active={kind}
        hrefFor={(id) =>
          id === "onboarding"
            ? "/settings/boarding-templates"
            : `/settings/boarding-templates?kind=${id}`
        }
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) =>
          `/settings/boarding-templates/${kind}/${encodeURIComponent(r.name)}`
        }
        empty="No templates defined yet."
        columns={[
          {
            header: "Template",
            cell: (r) => (
              <Link
                href={
                  `/settings/boarding-templates/${kind}/${encodeURIComponent(r.name)}` as Route
                }
                className="font-medium text-ink-800 hover:underline"
              >
                {r.name}
              </Link>
            ),
          },
          {
            header: "Department",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.department ?? "—",
          },
          {
            header: "Designation",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.designation ?? "—",
          },
          {
            header: "Grade",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.employeeGrade ?? "—",
          },
          {
            header: "Company",
            className: "text-ash-700",
            cell: (r) => r.company ?? "—",
          },
        ]}
      />
    </div>
  );
}

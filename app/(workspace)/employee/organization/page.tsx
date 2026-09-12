import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Network } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listOrgEmployees } from "@/lib/frappe/org-chart";
import { OrgTree } from "@/components/employee/org-tree";

export const metadata = { title: "Organization chart · Colossal HR" };

export default async function OrganizationChartPage() {
  const employees = await listOrgEmployees();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/employee" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to directory
      </Link>

      <PageHeader
        icon={Network}
        crumb="Employee · Organization chart"
        title="Organization chart"
        subtitle="Reporting lines across the company, built from each employee's 'reports to'. Click a card to open the profile."
      />

      <OrgTree employees={employees} />
    </div>
  );
}

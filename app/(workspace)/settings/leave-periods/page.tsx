import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarRange, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listCompanies } from "@/lib/frappe/lookups";
import { listLeavePeriods } from "@/lib/frappe/leave-admin";
import { LeavePeriodsAdmin } from "@/components/settings/leave-periods-admin";
import {
  createLeavePeriodAction,
  deleteLeavePeriodAction,
} from "@/app/(workspace)/hr/leaves/admin/actions";

export const metadata = { title: "Leave periods · Configuration · Colossal HR" };

export default async function LeavePeriodsPage() {
  const access = await getMyAccess();
  if (!(access.isHrAdmin || access.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/leave-periods"),
    );
  }
  const [periods, companies] = await Promise.all([
    listLeavePeriods(),
    listCompanies(),
  ]);
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
        icon={CalendarRange}
        crumb="Configuration · HR policy · Leave periods"
        title="Leave periods"
        subtitle="Time windows leave policies + earned-leave accrual are anchored to. Usually one per fiscal year."
      />
      <LeavePeriodsAdmin
        rows={periods}
        companies={companies}
        createAction={createLeavePeriodAction}
        deleteAction={deleteLeavePeriodAction}
      />
    </div>
  );
}

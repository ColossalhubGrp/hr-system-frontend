import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listCompanies, listHolidayLists } from "@/lib/frappe/lookups";
import {
  listBranches,
  listDepartments,
} from "@/lib/frappe/attendance-bulk";
import { BulkHolidayAssignForm } from "@/components/settings/bulk-holiday-assign-form";
import { bulkAssignHolidayListAction } from "@/app/(workspace)/hr/leaves/admin/actions";

export const metadata = {
  title: "Bulk assign holiday list · Configuration · Colossal HR",
};

export default async function BulkHolidayAssignPage() {
  const access = await getMyAccess();
  if (!(access.isHrAdmin || access.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/holiday-lists/assign"),
    );
  }
  const [lists, companies, departments, branches] = await Promise.all([
    listHolidayLists(),
    listCompanies(),
    listDepartments(),
    listBranches(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings/holiday-lists" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to holiday lists
      </Link>
      <PageHeader
        icon={CalendarDays}
        crumb="Configuration · HR policy · Bulk assign holiday list"
        title="Bulk assign a holiday list"
        subtitle="Set the same holiday list on every employee that matches the filters below. Skips employees whose Status is 'Left'."
      />
      <BulkHolidayAssignForm
        holidayLists={lists}
        companies={companies}
        departments={departments}
        branches={branches}
        action={bulkAssignHolidayListAction}
      />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  listAttendableEmployees,
  listBranches,
  listDepartments,
} from "@/lib/frappe/attendance-bulk";
import { listCompanies, listShiftTypes } from "@/lib/frappe/lookups";
import { BulkMarkForm } from "@/components/attendance/bulk-mark-form";
import { bulkMarkAttendanceAction } from "./actions";

export const metadata = { title: "Mark attendance in bulk · Colossal HR" };

type SP = {
  department?: string;
  branch?: string;
  company?: string;
  shift?: string;
};

export default async function BulkMarkPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const access = await getMyAccess();
  if (!access.isHrAdmin) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/hr/attendance/bulk"),
    );
  }

  const [employees, departments, branches, companies, shifts] =
    await Promise.all([
      listAttendableEmployees({
        department: searchParams.department,
        branch: searchParams.branch,
        company: searchParams.company,
        shift: searchParams.shift,
      }),
      listDepartments(),
      listBranches(),
      listCompanies(),
      listShiftTypes(),
    ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/attendance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to attendance
      </Link>

      <PageHeader
        icon={CalendarCheck}
        crumb="HR · Attendance · Bulk mark"
        title="Mark attendance in bulk"
        subtitle="Pick a day, filter employees, set a status per row (or apply one to all), save. Days already marked are skipped so this is safe to re-run."
      />

      <BulkMarkForm
        action={bulkMarkAttendanceAction}
        employees={employees}
        departments={departments}
        branches={branches}
        companies={companies}
        shifts={shifts}
        activeFilters={{
          department: searchParams.department ?? "",
          branch: searchParams.branch ?? "",
          company: searchParams.company ?? "",
          shift: searchParams.shift ?? "",
        }}
      />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, UserCog } from "lucide-react";
import { ScheduleAssignmentForm } from "@/components/shifts/schedule-assignment-form";
import { listCompanies } from "@/lib/frappe/lookups";
import { listShiftSchedules } from "@/lib/frappe/shift-schedules";
import { listEmployeeDirectory } from "@/lib/frappe/employee-write";
import { createShiftScheduleAssignmentAction } from "../../actions";

export const metadata = {
  title: "New schedule assignment · Colossal HR",
};

export default async function NewScheduleAssignmentPage() {
  const [schedulesResult, employeeDirectory, companies] = await Promise.all([
    listShiftSchedules({ enabled: "Yes", pageSize: 100 }),
    listEmployeeDirectory(),
    listCompanies(),
  ]);
  const schedules = schedulesResult.rows.map((s) => s.id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=schedule-assignments" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to schedule assignments
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <UserCog className="h-3.5 w-3.5" />
          HR · Shift Management · New schedule assignment
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Put an employee on a recurring schedule
        </h1>
      </header>

      <ScheduleAssignmentForm
        mode="create"
        action={createShiftScheduleAssignmentAction}
        schedules={schedules}
        employeeDirectory={employeeDirectory}
        companies={companies}
        cancelHref="/hr/shift-management?tab=schedule-assignments"
      />
    </div>
  );
}

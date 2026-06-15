import Link from "next/link";
import type { Route } from "next";
import { CalendarRange, ChevronLeft } from "lucide-react";
import { ShiftScheduleForm } from "@/components/shifts/shift-schedule-form";
import {
  listCompanies,
  listHolidayLists,
  listShiftTypes,
} from "@/lib/frappe/lookups";
import { createShiftScheduleAction } from "../../actions";

export const metadata = { title: "New shift schedule · Colossal HR" };

export default async function NewShiftSchedulePage() {
  const [shiftTypes, companies, holidayLists] = await Promise.all([
    listShiftTypes(),
    listCompanies(),
    listHolidayLists(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=schedules" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to schedules
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <CalendarRange className="h-3.5 w-3.5" />
          HR · Shift Management · New schedule
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Define a recurring shift schedule
        </h1>
        <p className="text-sm text-ash-600">
          A schedule is a template. Combine it with employees and a date range
          via a Schedule Assignment, then materialise it into real Shift
          Assignments.
        </p>
      </header>

      <ShiftScheduleForm
        mode="create"
        action={createShiftScheduleAction}
        shiftTypes={shiftTypes}
        companies={companies}
        holidayLists={holidayLists}
        cancelHref="/hr/shift-management?tab=schedules"
      />
    </div>
  );
}

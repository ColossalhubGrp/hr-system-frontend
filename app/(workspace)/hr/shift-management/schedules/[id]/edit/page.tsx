import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { CalendarRange, ChevronLeft } from "lucide-react";
import { ShiftScheduleForm } from "@/components/shifts/shift-schedule-form";
import {
  listCompanies,
  listHolidayLists,
  listShiftTypes,
} from "@/lib/frappe/lookups";
import { getShiftSchedule } from "@/lib/frappe/shift-schedules";
import { updateShiftScheduleAction } from "../../../actions";

export const metadata = { title: "Edit shift schedule · Colossal HR" };

export default async function EditShiftSchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [sched, shiftTypes, companies, holidayLists] = await Promise.all([
    getShiftSchedule(id),
    listShiftTypes(),
    listCompanies(),
    listHolidayLists(),
  ]);
  if (!sched) notFound();

  const action = updateShiftScheduleAction.bind(null, id);
  const backHref = `/hr/shift-management/schedules/${encodeURIComponent(id)}` as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {sched.scheduleName}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <CalendarRange className="h-3.5 w-3.5" />
          HR · Shift Management · Edit schedule
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit {sched.scheduleName}
        </h1>
      </header>

      <ShiftScheduleForm
        mode="edit"
        action={action}
        shiftTypes={shiftTypes}
        companies={companies}
        holidayLists={holidayLists}
        cancelHref={backHref}
        initial={{
          scheduleName: sched.scheduleName,
          shiftType: sched.shiftType,
          company: sched.company,
          holidayList: sched.holidayList,
          enabled: sched.enabled,
          monday: sched.monday,
          tuesday: sched.tuesday,
          wednesday: sched.wednesday,
          thursday: sched.thursday,
          friday: sched.friday,
          saturday: sched.saturday,
          sunday: sched.sunday,
          notes: sched.notes,
        }}
      />
    </div>
  );
}

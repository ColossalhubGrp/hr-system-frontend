import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock } from "lucide-react";
import { ShiftTypeForm } from "@/components/shifts/shift-type-form";
import { listHolidayLists } from "@/lib/frappe/lookups";
import { getShiftType } from "@/lib/frappe/shifts";
import { listShiftLocations } from "@/lib/frappe/shift-locations";
import { updateShiftTypeAction } from "../../../actions";

export const metadata = { title: "Edit shift type · Colossal HR" };

export default async function EditShiftTypePage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [shift, holidayLists, locResult] = await Promise.all([
    getShiftType(id),
    listHolidayLists(),
    listShiftLocations({ isActive: "Yes", pageSize: 100 }),
  ]);
  if (!shift) notFound();
  const shiftLocations = locResult.rows.map((l) => l.id);

  const action = updateShiftTypeAction.bind(null, id);
  const backHref = `/hr/shift-management/types/${encodeURIComponent(id)}` as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {id}
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Clock className="h-3.5 w-3.5" />
          HR · Shift Management · Edit {id}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit shift
        </h1>
      </header>

      <ShiftTypeForm
        mode="edit"
        action={action}
        holidayLists={holidayLists}
        shiftLocations={shiftLocations}
        cancelHref={backHref}
        initial={{
          name: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          color: shift.color,
          enableAutoAttendance: shift.enableAutoAttendance,
          allowCheckOutAfterShiftEndTime: shift.allowCheckOutAfterShiftEndTime,
          holidayList: shift.holidayList,
          workingHoursThresholdForHalfDay: shift.workingHoursThresholdForHalfDay,
          workingHoursThresholdForAbsent: shift.workingHoursThresholdForAbsent,
          regularDayMultiplier: shift.regularDayMultiplier,
          saturdayDayMultiplier: shift.saturdayDayMultiplier,
          sundayDayMultiplier: shift.sundayDayMultiplier,
          holidayDayMultiplier: shift.holidayDayMultiplier,
          allowedLocations: shift.allowedLocations,
        }}
      />
    </div>
  );
}

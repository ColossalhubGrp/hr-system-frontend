import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Clock } from "lucide-react";
import { ShiftTypeForm } from "@/components/shifts/shift-type-form";
import { listHolidayLists } from "@/lib/frappe/lookups";
import { listShiftLocations } from "@/lib/frappe/shift-locations";
import { createShiftTypeAction } from "../../actions";

export const metadata = { title: "New shift type · Colossal HR" };

export default async function NewShiftTypePage() {
  const [holidayLists, locResult] = await Promise.all([
    listHolidayLists(),
    listShiftLocations({ isActive: "Yes", pageSize: 100 }),
  ]);
  const shiftLocations = locResult.rows.map((l) => l.id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to shifts
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Clock className="h-3.5 w-3.5" />
          HR · Shift Management · New shift type
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Define a shift
        </h1>
      </header>

      <ShiftTypeForm
        mode="create"
        action={createShiftTypeAction}
        holidayLists={holidayLists}
        shiftLocations={shiftLocations}
        cancelHref="/hr/shift-management"
      />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, CalendarCheck } from "lucide-react";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { listCompanies, listShiftTypes } from "@/lib/frappe/lookups";
import { createAttendanceAction } from "../actions";

export const metadata = { title: "Mark attendance · Colossal HR" };

export default async function MarkAttendancePage({
  searchParams,
}: {
  searchParams: { employee?: string };
}) {
  const [shiftTypes, companies] = await Promise.all([
    listShiftTypes(),
    listCompanies(),
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
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <CalendarCheck className="h-3.5 w-3.5" />
          HR · Attendance · Mark
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Mark attendance
        </h1>
      </header>

      <AttendanceForm
        action={createAttendanceAction}
        shiftTypes={shiftTypes}
        companies={companies}
        defaultEmployee={searchParams.employee}
        cancelHref="/hr/attendance"
      />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Clock } from "lucide-react";
import { ShiftAssignmentForm } from "@/components/shifts/shift-assignment-form";
import { listCompanies, listShiftTypes } from "@/lib/frappe/lookups";
import { listEmployeeDirectory } from "@/lib/frappe/employee-write";
import { createShiftAssignmentAction } from "../../actions";

export const metadata = { title: "Assign shift · Colossal HR" };

export default async function NewShiftAssignmentPage({
  searchParams,
}: {
  searchParams: { employee?: string };
}) {
  const [shiftTypes, companies, employeeDirectory] = await Promise.all([
    listShiftTypes(),
    listCompanies(),
    listEmployeeDirectory(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=assignments" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to assignments
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Clock className="h-3.5 w-3.5" />
          HR · Shift Management · New assignment
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Assign a shift
        </h1>
      </header>

      <ShiftAssignmentForm
        action={createShiftAssignmentAction}
        shiftTypes={shiftTypes}
        companies={companies}
        employeeDirectory={employeeDirectory}
        defaultEmployee={searchParams.employee}
        cancelHref="/hr/shift-management?tab=assignments"
      />
    </div>
  );
}

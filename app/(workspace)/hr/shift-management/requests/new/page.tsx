import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Clock } from "lucide-react";
import { ShiftRequestForm } from "@/components/shifts/shift-request-form";
import { listShiftTypes } from "@/lib/frappe/lookups";
import { createShiftRequestAction } from "../../actions";

export const metadata = { title: "New shift request · Colossal HR" };

export default async function NewShiftRequestPage({
  searchParams,
}: {
  searchParams: { employee?: string };
}) {
  const shiftTypes = await listShiftTypes();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=requests" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to requests
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Clock className="h-3.5 w-3.5" />
          HR · Shift Management · New request
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          File a shift request
        </h1>
      </header>

      <ShiftRequestForm
        action={createShiftRequestAction}
        shiftTypes={shiftTypes}
        defaultEmployee={searchParams.employee}
        cancelHref="/hr/shift-management?tab=requests"
      />
    </div>
  );
}

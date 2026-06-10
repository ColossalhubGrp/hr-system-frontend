import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { AttendanceRequestForm } from "@/components/attendance/request-form";
import { listCompanies } from "@/lib/frappe/lookups";
import { createAttendanceRequestAction } from "../../actions";

export const metadata = { title: "New attendance request · Colossal HR" };

export default async function NewAttendanceRequestPage({
  searchParams,
}: {
  searchParams: { employee?: string };
}) {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/attendance?tab=requests" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to requests
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <ClipboardList className="h-3.5 w-3.5" />
          HR · Attendance · New request
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          File an attendance request
        </h1>
      </header>

      <AttendanceRequestForm
        action={createAttendanceRequestAction}
        companies={companies}
        defaultEmployee={searchParams.employee}
        cancelHref="/hr/attendance?tab=requests"
      />
    </div>
  );
}

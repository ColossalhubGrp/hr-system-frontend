import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, LogIn } from "lucide-react";
import { CheckinForm } from "@/components/attendance/checkin-form";
import { createCheckinAction } from "../../actions";

export const metadata = { title: "Log punch · Colossal HR" };

export default function NewCheckinPage({
  searchParams,
}: {
  searchParams: { employee?: string };
}) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/attendance?tab=checkins" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to check-ins
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <LogIn className="h-3.5 w-3.5" />
          HR · Attendance · Check-in
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Log a punch
        </h1>
        <p className="text-sm text-ash-600">
          Use this when a device punch failed and you need to file it manually.
        </p>
      </header>

      <CheckinForm
        action={createCheckinAction}
        defaultEmployee={searchParams.employee}
        cancelHref="/hr/attendance?tab=checkins"
      />
    </div>
  );
}

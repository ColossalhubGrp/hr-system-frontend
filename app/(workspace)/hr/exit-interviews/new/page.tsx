import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, DoorOpen } from "lucide-react";
import { ExitInterviewForm } from "@/components/exit-interview/exit-interview-form";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { createExitInterviewAction } from "../actions";

export const metadata = { title: "New exit interview · Colossal HR" };

export default async function NewExitInterviewPage() {
  const options = await fetchEmployeeFormOptions();
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/exit-interviews" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to interviews
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <DoorOpen className="h-3.5 w-3.5" />
          HR · Exit Interviews · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Schedule an exit interview
        </h1>
      </header>
      <ExitInterviewForm
        action={createExitInterviewAction}
        employeeDirectory={options.employeeDirectory}
      />
    </div>
  );
}

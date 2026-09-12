import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Clock3 } from "lucide-react";
import { OvertimeSlipForm } from "@/components/overtime-slip/slip-form";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { listCompanies } from "@/lib/frappe/lookups";
import { createOvertimeSlipAction } from "../actions";

export const metadata = { title: "New overtime slip · Colossal HR" };

export default async function NewOvertimeSlipPage() {
  const [options, companies] = await Promise.all([
    fetchEmployeeFormOptions(),
    listCompanies(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/overtime-slips" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to slips
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Clock3 className="h-3.5 w-3.5" />
          HR · Overtime Slips · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Create an overtime slip
        </h1>
      </header>
      <OvertimeSlipForm
        action={createOvertimeSlipAction}
        employeeDirectory={options.employeeDirectory}
        companies={companies}
      />
    </div>
  );
}

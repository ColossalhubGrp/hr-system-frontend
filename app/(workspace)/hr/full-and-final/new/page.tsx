import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, FileSpreadsheet } from "lucide-react";
import { FnfForm } from "@/components/fnf/fnf-form";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { listCompanies } from "@/lib/frappe/lookups";
import { createFnfAction } from "../actions";

export const metadata = { title: "New FnF statement · Colossal HR" };

export default async function NewFnfPage() {
  const [options, companies] = await Promise.all([
    fetchEmployeeFormOptions(),
    listCompanies(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/full-and-final" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to statements
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          HR · Full and Final · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Create a full and final statement
        </h1>
      </header>
      <FnfForm
        action={createFnfAction}
        employeeDirectory={options.employeeDirectory}
        companies={companies}
      />
    </div>
  );
}

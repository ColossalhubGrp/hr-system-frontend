import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, RefreshCcw } from "lucide-react";
import { CycleForm } from "@/components/performance/cycle-form";
import { listCompanies } from "@/lib/frappe/lookups";
import { createCycleAction } from "../../actions";

export const metadata = { title: "New appraisal cycle · Colossal HR" };

export default async function NewCyclePage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to performance
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <RefreshCcw className="h-3.5 w-3.5" />
          HR · Performance · New appraisal cycle
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Define an appraisal cycle
        </h1>
      </header>
      <CycleForm
        action={createCycleAction}
        companies={companies}
        cancelHref="/hr/performance"
      />
    </div>
  );
}

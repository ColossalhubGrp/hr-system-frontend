import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { PipForm } from "@/components/performance/pip-form";
import { listAppraisalCyclesNames } from "@/lib/frappe/lookups";
import { createPipAction } from "../../actions";

export const metadata = { title: "New PIP · Colossal HR" };

export default async function NewPipPage() {
  const cycles = await listAppraisalCyclesNames();
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance?tab=pip" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to PIPs
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          HR · Performance · New PIP
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          File a Performance Improvement Plan
        </h1>
      </header>
      <PipForm
        action={createPipAction}
        cycles={cycles}
        cancelHref="/hr/performance?tab=pip"
      />
    </div>
  );
}

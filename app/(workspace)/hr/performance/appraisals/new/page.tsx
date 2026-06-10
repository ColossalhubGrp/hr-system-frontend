import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Target } from "lucide-react";
import { AppraisalForm } from "@/components/performance/appraisal-form";
import {
  listAppraisalCyclesNames,
  listAppraisalTemplates,
} from "@/lib/frappe/lookups";
import { createAppraisalAction } from "../../actions";

export const metadata = { title: "New appraisal · Colossal HR" };

export default async function NewAppraisalPage() {
  const [cycles, templates] = await Promise.all([
    listAppraisalCyclesNames(),
    listAppraisalTemplates(),
  ]);
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
          <Target className="h-3.5 w-3.5" />
          HR · Performance · New appraisal
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Start an appraisal
        </h1>
      </header>
      <AppraisalForm
        action={createAppraisalAction}
        cycles={cycles}
        templates={templates}
        cancelHref="/hr/performance"
      />
    </div>
  );
}

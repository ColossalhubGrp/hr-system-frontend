import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getNecSchedule } from "@/lib/payroll-engine/setup";
import { NecScheduleEditor } from "@/components/payroll/nec-schedule-editor";

export const metadata = { title: "NEC schedule · Setup · Payroll" };
export const dynamic = "force-dynamic";

export default async function NecSchedulePage({
  params,
}: {
  params: { industry: string };
}) {
  const industry = decodeURIComponent(params.industry);
  const data = await getNecSchedule(industry);
  if (!data.industry) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={"/payroll/setup/nec" as Route}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to NEC / industry
      </Link>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          NEC schedule
        </p>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          {industry}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-grade salaries this NEC publishes. Employees on this
          industry inherit these figures when their pay grade is inside
          NEC.
        </p>
      </div>

      <NecScheduleEditor
        industry={industry}
        gradingSystem={data.grading_system}
        rows={data.rows}
      />
    </div>
  );
}

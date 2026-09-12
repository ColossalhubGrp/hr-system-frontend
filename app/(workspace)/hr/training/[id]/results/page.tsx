import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ResultsForm } from "@/components/training/results-form";
import { getTrainingEvent } from "@/lib/frappe/training";
import { getMyAccess } from "@/lib/frappe/roles";
import { saveTrainingResultAction } from "./actions";

export const metadata = { title: "Training results · Colossal HR" };

export default async function TrainingResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [event, access] = await Promise.all([getTrainingEvent(id), getMyAccess()]);
  if (!event) notFound();
  if (!(access.isHrAdmin || access.isItAdmin))
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent(`/hr/training/${id}/results`),
    );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/hr/training/${encodeURIComponent(id)}` as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to event
      </Link>
      <PageHeader
        icon={ClipboardCheck}
        crumb={`HR · Training · ${event.id} · Results`}
        title={`Grade attendees — ${event.eventName}`}
        subtitle="Enter hours, a grade and short comments. Saving creates a Training Result submitted for record."
      />
      <ResultsForm
        eventId={event.id}
        attendees={event.attendees.map((a) => ({
          employee: a.employee,
          employeeName: a.employeeName,
        }))}
        action={saveTrainingResultAction}
      />
    </div>
  );
}

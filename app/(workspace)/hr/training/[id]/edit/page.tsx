import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { TrainingEventForm } from "@/components/training/event-form";
import {
  getTrainingEvent,
  getTrainingFormOptions,
  listTrainingProgramOptions,
} from "@/lib/frappe/training";
import { updateTrainingEventAction } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const e = await getTrainingEvent(decodeURIComponent(params.id));
  return {
    title: e ? `Edit ${e.eventName} · Colossal HR` : "Edit training event · Colossal HR",
  };
}

export default async function EditTrainingEventPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [event, programs, options] = await Promise.all([
    getTrainingEvent(id),
    listTrainingProgramOptions(),
    getTrainingFormOptions(),
  ]);
  if (!event) notFound();

  const action = updateTrainingEventAction.bind(null, id);
  const backHref = `/hr/training/${encodeURIComponent(id)}` as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {event.eventName}
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <GraduationCap className="h-3.5 w-3.5" />
          HR · Training · Edit event
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit training event
        </h1>
      </header>

      <TrainingEventForm
        mode="edit"
        action={action}
        programs={programs}
        suppliers={options.suppliers}
        typeOptions={options.eventTypeOptions}
        typeFieldtype={options.eventTypeFieldtype}
        typeLinkDoctype={options.eventTypeLinkDoctype}
        cancelHref={backHref}
        initial={{
          eventName: event.eventName,
          type: event.type,
          trainingProgram: event.trainingProgram,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          supplier: event.supplier,
          introduction: event.introduction,
        }}
      />
    </div>
  );
}

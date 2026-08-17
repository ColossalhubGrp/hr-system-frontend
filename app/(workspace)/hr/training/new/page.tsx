import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { TrainingEventForm } from "@/components/training/event-form";
import {
  getTrainingFormOptions,
  listTrainingProgramOptions,
} from "@/lib/frappe/training";
import { createTrainingEventAction } from "../actions";

export const metadata = { title: "New training event · Colossal HR" };

export default async function NewTrainingEventPage() {
  const [programs, options] = await Promise.all([
    listTrainingProgramOptions(),
    getTrainingFormOptions(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/training" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to training
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <GraduationCap className="h-3.5 w-3.5" />
          HR · Training · New event
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Schedule a training event
        </h1>
      </header>

      <TrainingEventForm
        action={createTrainingEventAction}
        programs={programs}
        suppliers={options.suppliers}
        typeOptions={options.eventTypeOptions}
        cancelHref="/hr/training"
      />
    </div>
  );
}

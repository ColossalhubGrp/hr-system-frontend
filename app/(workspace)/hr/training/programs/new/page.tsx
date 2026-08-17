import Link from "next/link";
import type { Route } from "next";
import { BookOpen, ChevronLeft } from "lucide-react";
import { TrainingProgramForm } from "@/components/training/program-form";
import { createTrainingProgramAction } from "../../actions";

export const metadata = { title: "New training program · Colossal HR" };

export default function NewTrainingProgramPage() {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/training?tab=programs" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to programs
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <BookOpen className="h-3.5 w-3.5" />
          HR · Training · New program
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Add a training program
        </h1>
      </header>

      <TrainingProgramForm
        action={createTrainingProgramAction}
        cancelHref="/hr/training?tab=programs"
      />
    </div>
  );
}

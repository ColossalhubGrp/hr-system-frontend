import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft } from "lucide-react";
import { TrainingProgramForm } from "@/components/training/program-form";
import {
  getTrainingFormOptions,
  getTrainingProgram,
} from "@/lib/frappe/training";
import { listCompanies } from "@/lib/frappe/lookups";
import { updateTrainingProgramAction } from "../../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const p = await getTrainingProgram(decodeURIComponent(params.id));
  return {
    title: p ? `Edit ${p.trainingProgramName} · Colossal HR` : "Edit program · Colossal HR",
  };
}

export default async function EditTrainingProgramPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [program, options, companies] = await Promise.all([
    getTrainingProgram(id),
    getTrainingFormOptions(),
    listCompanies(),
  ]);
  if (!program) notFound();

  const action = updateTrainingProgramAction.bind(null, id);
  const backHref = "/hr/training?tab=programs" as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to programs
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <BookOpen className="h-3.5 w-3.5" />
          HR · Training · Edit program
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit {program.trainingProgramName}
        </h1>
      </header>

      <TrainingProgramForm
        mode="edit"
        action={action}
        companies={companies}
        suppliers={options.suppliers}
        hasVisibilityField={options.programFieldnames.has("is_public")}
        cancelHref={backHref}
        initial={{
          trainingProgramName: program.trainingProgramName,
          company: program.company,
          supplier: program.supplier,
          description: program.description,
          isPublic: program.isPublic,
        }}
      />
    </div>
  );
}

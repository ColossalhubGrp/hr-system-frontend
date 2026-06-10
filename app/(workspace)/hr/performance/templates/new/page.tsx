import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, FileText } from "lucide-react";
import { TemplateForm } from "@/components/performance/template-form";
import { createTemplateAction } from "../../actions";

export const metadata = { title: "New appraisal template · Colossal HR" };

export default function NewTemplatePage() {
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
          <FileText className="h-3.5 w-3.5" />
          HR · Performance · New appraisal template
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Create a template
        </h1>
      </header>
      <TemplateForm
        action={createTemplateAction}
        cancelHref="/hr/performance"
      />
    </div>
  );
}

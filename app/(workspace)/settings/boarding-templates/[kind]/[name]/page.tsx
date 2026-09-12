import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { BoardingTemplateForm } from "@/components/boarding-templates/template-form";
import { listCompanies } from "@/lib/frappe/lookups";
import {
  getOnboardingTemplate,
  getSeparationTemplate,
} from "@/lib/frappe/lifecycle-ext";
import { saveBoardingTemplateAction } from "../../actions";

export const metadata = { title: "Edit boarding template · Colossal HR" };

export default async function EditBoardingTemplatePage({
  params,
}: {
  params: { kind: string; name: string };
}) {
  const kind: "onboarding" | "separation" =
    params.kind === "separation" ? "separation" : "onboarding";
  const name = decodeURIComponent(params.name);
  const [tpl, companies] = await Promise.all([
    kind === "onboarding" ? getOnboardingTemplate(name) : getSeparationTemplate(name),
    listCompanies(),
  ]);
  if (!tpl) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/settings/boarding-templates?kind=${kind}` as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to templates
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <ClipboardList className="h-3.5 w-3.5" />
          Configuration · Boarding templates ·{" "}
          {kind === "onboarding" ? "Onboarding" : "Separation"} · {tpl.name}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit template
        </h1>
      </header>
      <BoardingTemplateForm
        kind={kind}
        action={saveBoardingTemplateAction}
        cancelHref={`/settings/boarding-templates?kind=${kind}`}
        companies={companies}
        initial={{
          name: tpl.name,
          department: tpl.department,
          designation: tpl.designation,
          employeeGrade: tpl.employeeGrade,
          company: tpl.company,
          activities: tpl.activities,
        }}
      />
    </div>
  );
}

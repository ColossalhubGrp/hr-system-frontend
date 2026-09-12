import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Gauge } from "lucide-react";
import { SkillAssessmentForm } from "@/components/skill-assessment/assessment-form";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { listSkills } from "@/lib/frappe/lookups";
import { createSkillAssessmentAction } from "../actions";

export const metadata = { title: "New skill assessment · Colossal HR" };

export default async function NewSkillAssessmentPage() {
  const [options, skills] = await Promise.all([
    fetchEmployeeFormOptions(),
    listSkills(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/skill-assessments" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to assessments
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Gauge className="h-3.5 w-3.5" />
          HR · Skill Assessments · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Log a skill assessment
        </h1>
      </header>
      <SkillAssessmentForm
        action={createSkillAssessmentAction}
        employeeDirectory={options.employeeDirectory}
        skills={skills}
      />
    </div>
  );
}

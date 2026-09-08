import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { getAppraisalTemplate } from "@/lib/frappe/setup-appraisal-templates";
import { listFeedbackCriteria } from "@/lib/frappe/setup-criteria";
import { TemplateEditor } from "@/components/setup/template-editor";
import { upsertAppraisalTemplateAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  return { title: `${name} · Appraisal templates · Colossal HR` };
}

export default async function EditAppraisalTemplatePage({
  params,
}: {
  params: { name: string };
}) {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent(
          `/settings/appraisal-templates/${params.name}`,
        ),
    );
  }
  const name = decodeURIComponent(params.name);
  const [tpl, pool] = await Promise.all([
    getAppraisalTemplate(name),
    listFeedbackCriteria(),
  ]);
  if (!tpl) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings/appraisal-templates" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to templates
      </Link>

      <PageHeader
        icon={ClipboardList}
        crumb={`Settings · HR policy · Appraisal templates · ${tpl.name}`}
        title={tpl.name}
        subtitle="Edit criteria + weightages. Existing cycles keep their linked template; new appraisals pull the current version at creation time."
      />

      <TemplateEditor
        mode="edit"
        action={upsertAppraisalTemplateAction}
        initial={{
          name: tpl.name,
          description: tpl.description,
          ratingCriteria: tpl.ratingCriteria,
        }}
        criteriaPool={pool.map((c) => c.name)}
      />
    </div>
  );
}

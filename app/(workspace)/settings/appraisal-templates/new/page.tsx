import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listFeedbackCriteria } from "@/lib/frappe/setup-criteria";
import { listKrasPool } from "@/lib/frappe/setup-appraisal-templates";
import { TemplateEditor } from "@/components/setup/template-editor";
import { upsertAppraisalTemplateAction } from "../actions";

export const metadata = {
  title: "New template · Appraisal templates · Colossal HR",
};

export default async function NewAppraisalTemplatePage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/appraisal-templates/new"),
    );
  }
  const [pool, krasPool] = await Promise.all([
    listFeedbackCriteria().then((rs) => rs.map((c) => c.name)),
    listKrasPool(),
  ]);

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
        crumb="Settings · HR policy · Appraisal templates · New"
        title="New appraisal template"
        subtitle="Give it a name, pick the criteria HR will score, set weightages that total 100."
      />

      <TemplateEditor
        mode="new"
        action={upsertAppraisalTemplateAction}
        criteriaPool={pool}
        krasPool={krasPool}
      />
    </div>
  );
}

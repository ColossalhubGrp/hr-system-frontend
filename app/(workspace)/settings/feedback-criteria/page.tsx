import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  countFeedbackCriteriaUsage,
  listFeedbackCriteria,
} from "@/lib/frappe/setup-criteria";
import { CriteriaManager } from "@/components/setup/criteria-manager";
import {
  createFeedbackCriterionAction,
  deleteFeedbackCriterionAction,
} from "./actions";

export const metadata = { title: "Feedback criteria · Settings · Colossal HR" };

export default async function FeedbackCriteriaPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/feedback-criteria"),
    );
  }

  const rows = await listFeedbackCriteria();
  const usage = await countFeedbackCriteriaUsage(rows.map((r) => r.name));

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Workspace settings
      </Link>

      <PageHeader
        icon={Star}
        crumb="Settings · HR policy · Feedback criteria"
        title="Feedback criteria"
        subtitle="The reusable pool of criteria HR picks when scoring appraisal feedback. Delete only ones not in use."
      />

      <CriteriaManager
        initialRows={rows.map((r) => ({
          name: r.name,
          usage: usage[r.name] ?? 0,
        }))}
        createAction={createFeedbackCriterionAction}
        deleteAction={deleteFeedbackCriterionAction}
      />
    </div>
  );
}

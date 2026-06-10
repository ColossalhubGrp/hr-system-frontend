import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ActionPanel } from "@/components/common/action-bar";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getFeedback } from "@/lib/frappe/performance";
import { submitFeedbackAction } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const f = await getFeedback(decodeURIComponent(params.id));
  return { title: f ? `${f.id} · Feedback · Colossal HR` : "Feedback" };
}

export default async function FeedbackDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const f = await getFeedback(id);
  if (!f) notFound();

  const submit = submitFeedbackAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance?tab=feedback" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to feedback
      </Link>

      <PageHeader
        icon={MessageSquare}
        crumb={`HR · Performance · Feedback · ${f.id}`}
        title={f.employeeName ?? f.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill
              status={f.docstatus === 1 ? "Submitted" : "Draft"}
            />
            <span>
              · by {f.reviewerName ?? f.reviewer ?? "—"}
            </span>
          </span>
        }
      />

      {f.docstatus === 0 && (
        <ActionPanel
          title="Submit this feedback"
          description="Once submitted it counts towards the employee's feedback average."
          label="Submit feedback"
          pendingLabel="Submitting…"
          action={submit}
        />
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Feedback
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Employee",
              value: (
                <Link
                  href={
                    `/employee/${encodeURIComponent(f.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {f.employeeName ?? f.employee}
                </Link>
              ),
            },
            { label: "Reviewer", value: f.reviewerName ?? f.reviewer },
            { label: "Appraisal cycle", value: f.appraisalCycle },
            { label: "Date", value: f.feedbackDate },
            {
              label: "Total score",
              value: f.totalScore === null ? null : f.totalScore.toFixed(2),
            },
            { label: "Feedback", value: f.feedback, wide: true },
          ]}
        />
      </section>
    </div>
  );
}

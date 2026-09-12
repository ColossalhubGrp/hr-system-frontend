import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageSquareQuote, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { TrainingFeedbackForm } from "@/components/training/feedback-form";
import { getTrainingEvent } from "@/lib/frappe/training";
import { listTrainingFeedback } from "@/lib/frappe/finance-training";
import { submitTrainingFeedbackAction } from "../results/actions";

export const metadata = { title: "Training feedback · Colossal HR" };

export default async function TrainingFeedbackPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { mode?: string };
}) {
  const id = decodeURIComponent(params.id);
  const [event, feedback] = await Promise.all([
    getTrainingEvent(id),
    listTrainingFeedback({ trainingEvent: id }),
  ]);
  if (!event) notFound();

  const showForm = searchParams.mode === "new";
  const avg =
    feedback.filter((f) => f.rating != null).reduce((a, f) => a + (f.rating ?? 0), 0) /
    Math.max(1, feedback.filter((f) => f.rating != null).length);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/hr/training/${encodeURIComponent(id)}` as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to event
      </Link>
      <PageHeader
        icon={MessageSquareQuote}
        crumb={`HR · Training · ${event.id} · Feedback`}
        title={`Feedback — ${event.eventName}`}
        subtitle={
          feedback.length > 0
            ? `${feedback.length} responses · avg rating ${avg.toFixed(1)} / 5`
            : "No feedback yet."
        }
        actions={
          !showForm ? (
            <Link
              href={
                `/hr/training/${encodeURIComponent(id)}/feedback?mode=new` as Route
              }
              className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
            >
              <Plus className="h-4 w-4" />
              Add feedback
            </Link>
          ) : undefined
        }
      />

      {showForm ? (
        <TrainingFeedbackForm
          eventId={event.id}
          attendees={event.attendees.map((a) => ({
            employee: a.employee,
            employeeName: a.employeeName,
          }))}
          action={submitTrainingFeedbackAction}
        />
      ) : feedback.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-8 text-center text-sm text-ash-500">
          No feedback submitted for this event yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {feedback.map((f) => (
            <article key={f.name} className="card p-4">
              <header className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-ash-900">
                  {f.employeeName ?? f.employee}
                </div>
                <div className="flex items-center gap-3 text-xs text-ash-500">
                  {f.rating != null && <span>★ {f.rating.toFixed(1)}</span>}
                  <StatusPill status={f.docstatus === 1 ? "Submitted" : "Draft"} />
                </div>
              </header>
              <p className="text-sm text-ash-800 whitespace-pre-wrap">
                {f.feedback ?? "—"}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

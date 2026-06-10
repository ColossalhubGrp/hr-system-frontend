import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { FeedbackForm } from "@/components/performance/feedback-form";
import { listAppraisalCyclesNames } from "@/lib/frappe/lookups";
import { createFeedbackAction } from "../../actions";

export const metadata = { title: "New feedback · Colossal HR" };

export default async function NewFeedbackPage() {
  const cycles = await listAppraisalCyclesNames();
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance?tab=feedback" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to feedback
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <MessageSquare className="h-3.5 w-3.5" />
          HR · Performance · New feedback
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Leave feedback
        </h1>
      </header>
      <FeedbackForm
        action={createFeedbackAction}
        cycles={cycles}
        cancelHref="/hr/performance?tab=feedback"
      />
    </div>
  );
}

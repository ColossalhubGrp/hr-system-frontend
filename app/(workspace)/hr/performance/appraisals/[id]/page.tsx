import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Target } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ActionPanel } from "@/components/common/action-bar";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getAppraisal } from "@/lib/frappe/performance";
import {
  cancelAppraisalAction,
  submitAppraisalAction,
} from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const a = await getAppraisal(decodeURIComponent(params.id));
  return {
    title: a ? `${a.id} · Appraisal · Colossal HR` : "Appraisal · Colossal HR",
  };
}

export default async function AppraisalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const a = await getAppraisal(id);
  if (!a) notFound();

  const submit = submitAppraisalAction.bind(null, id);
  const cancel = cancelAppraisalAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to performance
      </Link>

      <PageHeader
        icon={Target}
        crumb={`HR · Performance · Appraisal · ${a.id}`}
        title={a.employeeName ?? a.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={a.status} />
            {a.appraisalCycle && <span>· {a.appraisalCycle}</span>}
          </span>
        }
      />

      {a.docstatus === 0 && (
        <ActionPanel
          title="This appraisal is a draft"
          description="Submit it to finalise scores. Cancel later if you need to redo."
          label="Submit appraisal"
          pendingLabel="Submitting…"
          action={submit}
        />
      )}
      {a.docstatus === 1 && (
        <ActionPanel
          title="Cancel this appraisal"
          description="Reverts the final scores; the record stays for audit."
          label="Cancel"
          pendingLabel="Cancelling…"
          tone="danger"
          action={cancel}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Score label="Self" value={a.selfScore} />
        <Score label="Feedback avg" value={a.averageFeedbackScore} />
        <Score label="Goals" value={a.goalScore} />
        <Score label="Final" value={a.finalScore} highlight />
      </div>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Appraisal
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Employee",
              value: (
                <Link
                  href={
                    `/employee/${encodeURIComponent(a.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {a.employeeName ?? a.employee}
                </Link>
              ),
            },
            { label: "Appraisal cycle", value: a.appraisalCycle },
            { label: "Template", value: a.appraisalTemplate },
            { label: "Start", value: a.startDate },
            { label: "End", value: a.endDate },
            { label: "Reviewer", value: a.reviewerName ?? a.reviewer },
            { label: "Status", value: a.status },
            {
              label: "Rating",
              value: a.rating == null ? null : a.rating.toFixed(2),
            },
          ]}
        />
      </section>
    </div>
  );
}

function Score({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-hairline bg-surface p-4 shadow-card ${highlight ? "bg-ink-50/40 border-ink-100" : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold ${highlight ? "text-ink-800" : "text-ink-900"}`}
      >
        {value == null ? "—" : value.toFixed(2)}
      </p>
    </div>
  );
}

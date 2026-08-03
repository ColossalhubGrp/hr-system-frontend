import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { ActionPanel } from "@/components/common/action-bar";
import { FieldGrid } from "@/components/employee/field-grid";
import {
  getLifecycleRecord,
  type LifecycleRecord,
} from "@/lib/frappe/lifecycle-write";
import { LIFECYCLE_META, type LifecycleKind } from "@/lib/frappe/lifecycle";
import {
  listAssignmentRoles,
  listAssignmentUsers,
  listLifecycleActivities,
} from "@/lib/frappe/lifecycle-activities";
import { getMyAccess } from "@/lib/frappe/roles";
import { ActivitiesPanel } from "@/components/lifecycle/activities-panel";
import {
  cancelPromotionAction,
  cancelTransferAction,
  completeOnboardingAction,
  completeSeparationAction,
  invalidateGrievanceAction,
  investigateGrievanceAction,
  resolveGrievanceAction,
  startOnboardingAction,
  startSeparationAction,
  submitPromotionAction,
  submitTransferAction,
} from "../../actions";

const KINDS: LifecycleKind[] = [
  "onboarding",
  "separation",
  "transfer",
  "promotion",
  "grievance",
];

function isKind(v: unknown): v is LifecycleKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}

export async function generateMetadata({
  params,
}: {
  params: { kind: string; id: string };
}) {
  if (!isKind(params.kind)) return { title: "Lifecycle · Colossal HR" };
  return {
    title: `${decodeURIComponent(params.id)} · ${LIFECYCLE_META[params.kind].label}`,
  };
}

export default async function LifecycleDetailPage({
  params,
}: {
  params: { kind: string; id: string };
}) {
  if (!isKind(params.kind)) notFound();
  const kind = params.kind;
  const id = decodeURIComponent(params.id);
  const record = await getLifecycleRecord(kind, id);
  if (!record) notFound();

  const meta = LIFECYCLE_META[kind];
  const back = `/employee/lifecycle/${kind}` as Route;

  // Activities checklist only applies to Onboarding + Separation — the two
  // DocTypes whose child `activities` table backs the Employee Boarding
  // Activity rows. Transfers / Promotions / Grievances have no checklist.
  const isBoardingKind = kind === "onboarding" || kind === "separation";
  const [activities, access, assignableUsers, assignableRoles] =
    isBoardingKind
      ? await Promise.all([
          listLifecycleActivities(
            id,
            kind === "onboarding" ? "Employee Onboarding" : "Employee Separation",
          ),
          getMyAccess(),
          listAssignmentUsers(),
          listAssignmentRoles(),
        ])
      : [[], null, [], []];
  const canEditActivities = Boolean(access?.isHrAdmin || access?.isHrAny);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={back}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {meta.label.toLowerCase()}
      </Link>

      <PageHeader
        icon={GitBranch}
        crumb={`Employee · Lifecycle · ${meta.label} · ${record.id}`}
        title={record.employeeName ?? record.employee ?? record.id}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={record.status} />
            <span>· {meta.label}</span>
          </span>
        }
      />

      <WorkflowPanels kind={kind} record={record} />

      {(kind === "onboarding" || kind === "separation") && (
        <ActivitiesPanel
          kind={kind}
          parentId={id}
          initial={activities}
          editable={canEditActivities}
          users={assignableUsers}
          roles={assignableRoles}
        />
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          {meta.label}
        </h2>
        <FieldGrid fields={fieldsFor(kind, record)} />
      </section>
    </div>
  );
}

// -------------------------------------------------- workflow panel switch

function WorkflowPanels({
  kind,
  record,
}: {
  kind: LifecycleKind;
  record: LifecycleRecord;
}) {
  if (kind === "onboarding" || kind === "separation") {
    return <BoardingPanels kind={kind} record={record} />;
  }
  if (kind === "transfer" || kind === "promotion") {
    return <SubmittablePanels kind={kind} record={record} />;
  }
  return <GrievancePanel record={record} />;
}

function BoardingPanels({
  kind,
  record,
}: {
  kind: "onboarding" | "separation";
  record: LifecycleRecord;
}) {
  const start =
    kind === "onboarding" ? startOnboardingAction : startSeparationAction;
  const complete =
    kind === "onboarding" ? completeOnboardingAction : completeSeparationAction;
  const action = (a: typeof start) => a.bind(null, record.id);

  if (record.status === "Pending") {
    return (
      <ActionPanel
        title="Kick this off"
        description="Move from Pending → In Process so the assignees can start ticking tasks."
        label="Start"
        pendingLabel="Starting…"
        action={action(start)}
      />
    );
  }
  if (record.status === "In Process") {
    return (
      <ActionPanel
        title="Mark complete"
        description={
          kind === "separation"
            ? "Completing this run sets the employee's relieving date and flips their status to Left."
            : "Completing this run finishes the onboarding workflow for this employee."
        }
        label="Mark complete"
        pendingLabel="Completing…"
        action={action(complete)}
      />
    );
  }
  // Completed — no further actions.
  return null;
}

function SubmittablePanels({
  kind,
  record,
}: {
  kind: "transfer" | "promotion";
  record: LifecycleRecord;
}) {
  const submit = kind === "transfer" ? submitTransferAction : submitPromotionAction;
  const cancel = kind === "transfer" ? cancelTransferAction : cancelPromotionAction;

  if (record.docstatus === 0) {
    // Frappe's before_submit throws when transfer_date / promotion_date > today
    // ("cannot be submitted before Transfer Date"). Rather than let HR hit that
    // wall, surface it as a static waiting-card so the affordance is honest.
    const dateField = kind === "transfer" ? "transfer_date" : "promotion_date";
    const effectiveDate = (record.raw[dateField] as string | null) ?? null;
    const isFuture = effectiveDate ? effectiveDate > isoToday() : false;

    const change = describeChange(kind, record);

    if (isFuture && effectiveDate) {
      return (
        <div className="rounded-card border border-hairline bg-canvas/60 p-4">
          <p className="text-sm font-medium text-foreground">
            Waiting for {kind === "transfer" ? "transfer" : "promotion"} date
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {change ? `${change}. ` : ""}
            This becomes submittable on <b>{effectiveDate}</b>. Until then it
            stays as Draft so the change doesn&apos;t apply early.
          </p>
        </div>
      );
    }

    return (
      <ActionPanel
        title={`Submit this ${kind}`}
        description={
          change
            ? `${change}. Submitting applies it to the employee record now.`
            : `Submitting applies the recorded change to the employee record on the ${kind} date.`
        }
        label="Submit"
        pendingLabel="Submitting…"
        action={submit.bind(null, record.id)}
      />
    );
  }
  if (record.docstatus === 1) {
    return (
      <ActionPanel
        title={`Cancel this ${kind}`}
        description="Reverts the change on the employee record; the audit row stays."
        label="Cancel"
        pendingLabel="Cancelling…"
        tone="danger"
        action={cancel.bind(null, record.id)}
      />
    );
  }
  return null;
}

function isoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Read the change-set row(s) off the raw doc and phrase them as
 *  human-language ("Sets department to Sales - RI"). Returns null when
 *  the doc has no rows (legacy transfers may be shaped differently). */
function describeChange(
  kind: "transfer" | "promotion",
  record: LifecycleRecord,
): string | null {
  const rowsKey =
    kind === "transfer" ? "employee_transfer_details" : "employee_promotion_details";
  const rows = (record.raw[rowsKey] as Array<{ fieldname?: string; new?: string }> | undefined) ?? [];
  if (rows.length === 0) return null;
  const parts = rows
    .filter((r) => r.fieldname && r.new)
    .map((r) => `${humanize(r.fieldname!)} → ${r.new}`);
  if (parts.length === 0) return null;
  return `Sets ${parts.join(", ")}`;
}

function humanize(fieldname: string): string {
  return fieldname
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^Pay Grade$/, "pay grade")
    .replace(/^Reports To$/, "reports to")
    .replace(/^Default Shift$/, "default shift")
    .replace(/^Employment Type$/, "employment type");
}

function GrievancePanel({ record }: { record: LifecycleRecord }) {
  if (record.status === "Resolved" || record.status === "Invalid") return null;

  const investigate = investigateGrievanceAction.bind(null, record.id);
  const resolve = resolveGrievanceAction.bind(null, record.id);
  const invalidate = invalidateGrievanceAction.bind(null, record.id);

  if (record.status === "Open") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <ActionPanel
          title="Start investigation"
          description="Acknowledge the grievance and move it into the investigation queue."
          label="Mark as Investigated"
          pendingLabel="Updating…"
          action={investigate}
        />
        <ActionPanel
          title="Reject as invalid"
          description="Use sparingly — closes the grievance without resolution."
          label="Mark Invalid"
          pendingLabel="Updating…"
          tone="danger"
          action={invalidate}
        />
      </div>
    );
  }

  // Investigated → can resolve or mark invalid.
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <ActionPanel
        title="Resolve"
        description="Close out the grievance — record the resolution in the description if needed."
        label="Mark Resolved"
        pendingLabel="Updating…"
        action={resolve}
      />
      <ActionPanel
        title="Mark invalid"
        description="Use sparingly — closes the grievance without resolution."
        label="Mark Invalid"
        pendingLabel="Updating…"
        tone="danger"
        action={invalidate}
      />
    </div>
  );
}

// -------------------------------------------------- per-kind field grid

function fieldsFor(
  kind: LifecycleKind,
  rec: LifecycleRecord,
): { label: string; value: React.ReactNode; wide?: boolean }[] {
  const r = rec.raw;
  const empLink = rec.employee ? (
    <Link
      href={`/employee/${encodeURIComponent(rec.employee)}` as Route}
      className="font-medium text-ink-800 hover:underline"
    >
      {rec.employeeName ?? rec.employee}
    </Link>
  ) : null;

  switch (kind) {
    case "onboarding":
    case "separation":
      return [
        { label: "Employee", value: empLink },
        { label: "Status", value: rec.status },
        { label: "Company", value: rec.company },
        { label: "Department", value: rec.department },
        { label: "Designation", value: rec.designation },
        {
          label: kind === "onboarding" ? "Onboarding begins" : "Offboarding begins",
          value: (r.boarding_begins_on as string) ?? null,
        },
        ...(kind === "separation"
          ? [
              {
                label: "Resignation letter date",
                value: (r.resignation_letter_date as string) ?? null,
              },
              {
                label: "Exit interview summary",
                value: (r.exit_interview_summary as string) ?? null,
                wide: true as const,
              },
            ]
          : []),
      ];
    case "transfer":
      return [
        { label: "Employee", value: empLink },
        { label: "Transfer date", value: (r.transfer_date as string) ?? null },
        { label: "From company", value: rec.company },
        { label: "To company", value: (r.new_company as string) ?? null },
        { label: "Reason", value: (r.remarks as string) ?? null, wide: true },
        {
          label: "Status",
          value:
            rec.docstatus === 1
              ? "Submitted"
              : rec.docstatus === 2
                ? "Cancelled"
                : "Draft",
        },
      ];
    case "promotion":
      return [
        { label: "Employee", value: empLink },
        { label: "Promotion date", value: (r.promotion_date as string) ?? null },
        { label: "Company", value: rec.company },
        { label: "Reason", value: (r.remarks as string) ?? null, wide: true },
        {
          label: "Status",
          value:
            rec.docstatus === 1
              ? "Submitted"
              : rec.docstatus === 2
                ? "Cancelled"
                : "Draft",
        },
      ];
    case "grievance":
      return [
        { label: "Subject", value: (r.subject as string) ?? null, wide: true },
        { label: "Raised by", value: empLink },
        { label: "Date raised", value: (r.grievance_raised_date as string) ?? null },
        { label: "Against type", value: (r.grievance_against_type as string) ?? null },
        { label: "Against", value: (r.grievance_against as string) ?? null },
        { label: "Type", value: (r.grievance_type as string) ?? null },
        {
          label: "Cause",
          value: (r.cause_of_grievance as string) ?? null,
          wide: true,
        },
        {
          label: "Description",
          value: (r.description as string) ?? null,
          wide: true,
        },
        { label: "Status", value: rec.status },
      ];
  }
}

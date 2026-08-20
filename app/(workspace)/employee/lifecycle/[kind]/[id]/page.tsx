import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, GitBranch, Info } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { ActionPanel } from "@/components/common/action-bar";
import { FieldGrid } from "@/components/employee/field-grid";
import {
  getLifecycleRecord,
  type LifecycleRecord,
} from "@/lib/frappe/lifecycle-write";
import { frappeCall } from "@/lib/frappe/client";
import { LIFECYCLE_META, type LifecycleKind } from "@/lib/frappe/lifecycle";
import {
  listAssignmentRoles,
  listLifecycleActivities,
} from "@/lib/frappe/lifecycle-activities";
import { listEmployeeDirectory } from "@/lib/frappe/employee-write";
import { getMyAccess } from "@/lib/frappe/roles";
import { ActivitiesPanel } from "@/components/lifecycle/activities-panel";
import {
  cancelPromotionAction,
  cancelTransferAction,
  completeOnboardingAction,
  completeSeparationAction,
  deleteOnboardingAction,
  deleteSeparationAction,
  invalidateGrievanceAction,
  investigateGrievanceAction,
  resolveGrievanceAction,
  startOnboardingAction,
  startSeparationAction,
  submitPromotionAction,
  submitTransferAction,
} from "../../actions";
import { DeleteRecordButton } from "@/components/lifecycle/delete-record-button";

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
  searchParams,
}: {
  params: { kind: string; id: string };
  searchParams: { duplicate?: string; existing_status?: string };
}) {
  if (!isKind(params.kind)) notFound();
  const kind = params.kind;
  const id = decodeURIComponent(params.id);
  const record = await getLifecycleRecord(kind, id);
  if (!record) notFound();

  // `?duplicate=1` is set by the create action when it detects an
  // existing record already exists for the same employee and redirects
  // here instead of piling another row on top (Frappe HR's duplicate
  // validator blocks even Completed rows). The banner tells the user
  // why they're on this page rather than the fresh-record page they
  // were expecting; `existing_status` picks the copy so a Completed
  // row's banner offers Delete-and-refile while an active row's banner
  // asks the user to finish / cancel first.
  const wasDuplicateRedirect = searchParams.duplicate === "1";
  const existingStatus = searchParams.existing_status;

  const meta = LIFECYCLE_META[kind];
  const back = `/employee/lifecycle/${kind}` as Route;

  // Activities checklist only applies to Onboarding + Separation — the two
  // DocTypes whose child `activities` table backs the Employee Boarding
  // Activity rows. Transfers / Promotions / Grievances have no checklist.
  const isBoardingKind = kind === "onboarding" || kind === "separation";
  const [activities, access, employeeDirectory, assignableRoles] =
    isBoardingKind
      ? await Promise.all([
          listLifecycleActivities(
            id,
            kind === "onboarding" ? "Employee Onboarding" : "Employee Separation",
          ),
          getMyAccess(),
          // Every employee shows in the "Assign to user" picker — the
          // Server Action resolves the picked Employee id to a user_id
          // (auto-provisioning a login if needed) before writing the
          // activity, so we don't have to gate the dropdown on who
          // already has a User account.
          listEmployeeDirectory(),
          listAssignmentRoles(),
        ])
      : [[], null, [], []];
  const canEditActivities = Boolean(access?.isHrAdmin || access?.isHrAny);

  // Grievance's "Against" field stores just an employee ID / department
  // name / company name. When it points at an Employee, resolve the
  // display name so the detail page reads "Jane Doe (HR-EMP-00394)"
  // instead of a bare ID. Non-Employee targets already display fine as-is.
  if (
    kind === "grievance" &&
    record.raw.grievance_against_party === "Employee" &&
    record.raw.grievance_against
  ) {
    try {
      const res = await frappeCall<{ employee_name: string | null }>({
        method: "frappe.client.get_value",
        args: {
          doctype: "Employee",
          filters: JSON.stringify({ name: String(record.raw.grievance_against) }),
          fieldname: JSON.stringify(["employee_name"]),
        },
        as: "user",
      });
      if (res?.employee_name) {
        record.raw.grievance_against_display = `${res.employee_name} (${record.raw.grievance_against})`;
      }
    } catch (err) {
      console.error("[grievance] against-employee name resolve failed:", err);
    }
  }

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

      {wasDuplicateRedirect && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-card border border-amber-300 bg-amber-100/60 px-4 py-3 text-sm text-amber-900"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="flex flex-col gap-0.5">
            <b>
              {record.employeeName ?? record.employee ?? "This employee"}{" "}
              already has {existingStatus === "Completed" ? "a" : "an active"}{" "}
              {existingStatus === "Completed" ? "completed" : ""}{" "}
              {meta.label.toLowerCase()} on file.
            </b>
            <span className="text-xs">
              {existingStatus === "Completed"
                ? `We opened it here instead of starting a duplicate. Frappe HR won't allow two ${meta.label.toLowerCase()}s per employee — delete this one below if you need to file a fresh ${meta.label.toLowerCase()} (e.g. a rehire).`
                : `We opened it here instead of starting a duplicate. Finish or cancel this one first, then a fresh ${meta.label.toLowerCase()} can be filed.`}
            </span>
          </div>
        </div>
      )}

      <WorkflowPanels
        kind={kind}
        record={record}
        activitySummary={activitySummary(activities)}
      />

      {(kind === "onboarding" || kind === "separation") && (
        <ActivitiesPanel
          kind={kind}
          parentId={id}
          initial={activities}
          editable={canEditActivities}
          directory={employeeDirectory}
          roles={assignableRoles}
        />
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          {meta.label}
        </h2>
        <FieldGrid fields={fieldsFor(kind, record)} />
      </section>

      {isBoardingKind && canEditActivities && (
        <section className="flex flex-col gap-3 rounded-card border border-hairline bg-canvas/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">
              Delete this {meta.label.toLowerCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              Removes the row entirely. Use this to clean up duplicates or to
              unblock a fresh {meta.label.toLowerCase()} for the same employee.
            </p>
          </div>
          <DeleteRecordButton
            id={record.id}
            action={
              kind === "onboarding"
                ? deleteOnboardingAction
                : deleteSeparationAction
            }
            label={`Delete ${meta.label.toLowerCase()}`}
            confirmTitle={`Delete ${record.id}?`}
            confirmBody={`This permanently removes ${meta.label.toLowerCase()} ${record.id} for ${
              record.employeeName ?? record.employee ?? "this employee"
            }. Activities on the checklist are removed with it. This can't be undone.`}
          />
        </section>
      )}
    </div>
  );
}

// -------------------------------------------------- workflow panel switch

/** Small summary the Mark-Complete gate reads. Empty activities is a
 *  soft warning; required-but-incomplete activities are a hard block. */
type ActivitySummary = {
  total: number;
  requiredPending: string[];
};

function activitySummary(rows: Awaited<ReturnType<typeof listLifecycleActivities>>): ActivitySummary {
  return {
    total: rows.length,
    requiredPending: rows
      .filter((a) => a.requiredForEmployeeCreation && !a.completed)
      .map((a) => a.activityName),
  };
}

function WorkflowPanels({
  kind,
  record,
  activitySummary,
}: {
  kind: LifecycleKind;
  record: LifecycleRecord;
  activitySummary: ActivitySummary;
}) {
  if (kind === "onboarding" || kind === "separation") {
    return (
      <BoardingPanels
        kind={kind}
        record={record}
        activitySummary={activitySummary}
      />
    );
  }
  if (kind === "transfer" || kind === "promotion") {
    return <SubmittablePanels kind={kind} record={record} />;
  }
  return <GrievancePanel record={record} />;
}

function BoardingPanels({
  kind,
  record,
  activitySummary,
}: {
  kind: "onboarding" | "separation";
  record: LifecycleRecord;
  activitySummary: ActivitySummary;
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
    // Gate the Complete transition against the activities checklist:
    //   * Any activity flagged "required for employee creation" that
    //     isn't ticked off is a hard block (matches the backend guard
    //     in human_resources.api.lifecycle_activities.set_boarding_status).
    //   * An empty checklist is a soft warning — HR can still complete
    //     a run they never populated, but they see the nudge first.
    const requiredPending = activitySummary.requiredPending;
    const blocked =
      requiredPending.length > 0
        ? `${requiredPending.length} required ${
            requiredPending.length === 1 ? "activity is" : "activities are"
          } still outstanding: ${requiredPending.join(
            ", ",
          )}. Tick them off in the Activities panel before completing.`
        : null;
    const warning =
      !blocked && activitySummary.total === 0
        ? `This ${kind} has no activities yet. Add the tasks that need to happen (welcome pack, NDA, orientation…) before finishing — or continue if you're really done.`
        : null;
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
        blocked={blocked}
        warning={warning}
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
    // Backend compat classes (recruitment_app.compat.employee_transfer /
    // employee_promotion) allow future-dated submits: HR submits now,
    // the daily scheduler applies the change on the effective date.
    // The panel copy tells the user what to expect either way; the
    // static "Waiting for date" gate that used to live here is gone.
    const dateField = kind === "transfer" ? "transfer_date" : "promotion_date";
    const effectiveDate = (record.raw[dateField] as string | null) ?? null;
    const isFuture = effectiveDate ? effectiveDate > isoToday() : false;

    const change = describeChange(kind, record);

    const description = isFuture && effectiveDate
      ? `${change ? `${change}. ` : ""}Submit now to lock this in — the change applies automatically to the employee record on ${effectiveDate}. Nobody needs to come back on the day.`
      : change
        ? `${change}. Submitting applies it to the employee record now.`
        : `Submitting applies the recorded change to the employee record.`;

    return (
      <ActionPanel
        title={
          isFuture
            ? `Schedule this ${kind}`
            : `Submit this ${kind}`
        }
        description={description}
        label={isFuture ? "Submit & schedule" : "Submit"}
        pendingLabel="Submitting…"
        action={submit.bind(null, record.id)}
      />
    );
  }
  if (record.docstatus === 1) {
    // A submitted future-dated Transfer / Promotion has `applied_on`
    // NULL until the scheduler runs on the effective date. Surface a
    // hint so HR knows why the Employee record looks unchanged.
    const dateField = kind === "transfer" ? "transfer_date" : "promotion_date";
    const effectiveDate = (record.raw[dateField] as string | null) ?? null;
    const appliedOn = (record.raw.applied_on as string | null) ?? null;
    const isPendingApply =
      !appliedOn && Boolean(effectiveDate) && effectiveDate! > isoToday();

    if (isPendingApply) {
      return (
        <div className="flex flex-col gap-3">
          <div
            role="status"
            className="rounded-card border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900"
          >
            <p className="text-sm font-medium text-amber-900">
              Scheduled — applies on {effectiveDate}
            </p>
            <p className="mt-0.5">
              Locked in. The employee record still shows the current
              values; the daily job flips them to the new ones on the
              effective date. Cancel below if plans change.
            </p>
          </div>
          <ActionPanel
            title={`Cancel this ${kind}`}
            description="Cancels the schedule; the employee record is untouched (no changes have been applied yet). The audit row stays for the trail."
            label="Cancel"
            pendingLabel="Cancelling…"
            tone="danger"
            action={cancel.bind(null, record.id)}
          />
        </div>
      );
    }
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
        {
          label: "Reason",
          value:
            (r.reason as string | null) ?? (r.remarks as string | null) ?? null,
          wide: true,
        },
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
        {
          label: "Reason",
          value:
            (r.reason as string | null) ?? (r.remarks as string | null) ?? null,
          wide: true,
        },
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
    case "grievance": {
      // Grievance stores its raiser in `raised_by` (Employee link), not
      // `employee`, so the shared empLink was always null. Build a proper
      // link off the raw field.
      const raisedByRaw = (r.raised_by as string | null) ?? null;
      const raisedByLink = raisedByRaw ? (
        <Link
          href={`/employee/${encodeURIComponent(raisedByRaw)}` as Route}
          className="font-medium text-ink-800 hover:underline"
        >
          {raisedByRaw}
        </Link>
      ) : null;
      // The date field is called `date` on the DocType even though the
      // form labels it "Date raised"; and Against Type lives in
      // `grievance_against_party`. Read the right columns.
      const dateRaised = (r.date as string | null) ?? null;
      const againstType = (r.grievance_against_party as string | null) ?? null;
      const againstDisplay =
        (r.grievance_against_display as string | null) ??
        (r.grievance_against as string | null) ??
        null;
      return [
        { label: "Subject", value: (r.subject as string) ?? null, wide: true },
        { label: "Raised by", value: raisedByLink },
        { label: "Date raised", value: dateRaised },
        { label: "Against type", value: againstType },
        { label: "Against", value: againstDisplay },
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
}

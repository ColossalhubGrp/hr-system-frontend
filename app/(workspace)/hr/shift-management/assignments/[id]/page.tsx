import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ActionPanel } from "@/components/common/action-bar";
import { DeleteConfirm } from "@/components/common/delete-confirm";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getShiftAssignment } from "@/lib/frappe/shifts";
import {
  cancelShiftAssignmentAction,
  deleteShiftAssignmentAction,
  submitShiftAssignmentAction,
} from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const a = await getShiftAssignment(decodeURIComponent(params.id));
  return {
    title: a
      ? `${a.id} · Assignment · Colossal HR`
      : "Shift assignment · Colossal HR",
  };
}

export default async function ShiftAssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const a = await getShiftAssignment(id);
  if (!a) notFound();

  const submit = submitShiftAssignmentAction.bind(null, id);
  const cancel = cancelShiftAssignmentAction.bind(null, id);
  const onDelete = deleteShiftAssignmentAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=assignments" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to assignments
      </Link>

      <PageHeader
        icon={Clock}
        crumb={`HR · Shift Management · ${a.id}`}
        title={a.employeeName ?? a.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={a.status} />
            <span>· {a.shiftType}</span>
          </span>
        }
      />

      {a.docstatus === 0 && (
        <ActionPanel
          title="This assignment is a draft"
          description="Submit it so it counts towards attendance and shift schedules."
          label="Submit"
          pendingLabel="Submitting…"
          action={submit}
        />
      )}
      {a.docstatus === 1 && a.status === "Active" && (
        <ActionPanel
          title="Cancel this assignment"
          description="Cancelling stops the shift from being applied; the record stays for audit."
          label="Cancel assignment"
          pendingLabel="Cancelling…"
          tone="danger"
          action={cancel}
        />
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Assignment
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
            {
              label: "Shift type",
              value: (
                <Link
                  href={
                    `/hr/shift-management/types/${encodeURIComponent(a.shiftType)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {a.shiftType}
                </Link>
              ),
            },
            { label: "Start date", value: fmtDate(a.startDate) },
            { label: "End date", value: a.endDate ? fmtDate(a.endDate) : "Ongoing" },
            { label: "Company", value: a.company },
            { label: "Department", value: a.department },
            { label: "Status", value: a.status },
            { label: "Source request", value: a.shiftRequest },
          ]}
        />
      </section>

      {a.docstatus === 0 && (
        <DeleteConfirm
          title={`Delete draft assignment ${a.id}`}
          description="Only draft assignments can be deleted. Submitted ones must be cancelled instead."
          action={onDelete}
        />
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

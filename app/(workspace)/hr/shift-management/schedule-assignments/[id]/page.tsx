import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, UserCog } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DeleteConfirm } from "@/components/common/delete-confirm";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { MaterialisePanel } from "@/components/shifts/materialise-panel";
import { getShiftScheduleAssignment } from "@/lib/frappe/shift-schedules";
import {
  deleteShiftScheduleAssignmentAction,
  materialiseScheduleAction,
} from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const a = await getShiftScheduleAssignment(decodeURIComponent(params.id));
  return {
    title: a
      ? `${a.id} · Schedule Assignment · Colossal HR`
      : "Schedule Assignment",
  };
}

export default async function ScheduleAssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const sa = await getShiftScheduleAssignment(id);
  if (!sa) notFound();

  const onDelete = deleteShiftScheduleAssignmentAction.bind(null, id);
  const editHref =
    `/hr/shift-management/schedule-assignments/${encodeURIComponent(id)}/edit` as Route;

  // Default the materialise window to a 14-day slice that's actually inside
  // the schedule assignment's own range — clamped to today on the lower end so
  // we never default to a window in the past.
  const today = new Date();
  const todayIso = isoLocal(today);
  const defaultFrom =
    sa.startDate > todayIso ? sa.startDate : todayIso;
  const [fy, fm, fd] = defaultFrom.split("-").map(Number);
  const plus14 = new Date(fy!, (fm ?? 1) - 1, fd ?? 1);
  plus14.setDate(plus14.getDate() + 13);
  const candidate = isoLocal(plus14);
  const defaultTo =
    sa.endDate && sa.endDate < candidate ? sa.endDate : candidate;

  const materialise = materialiseScheduleAction.bind(null, {
    scheduleId: sa.shiftSchedule,
    employee: sa.employee,
    company: sa.company ?? undefined,
  });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=schedule-assignments" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to schedule assignments
      </Link>

      <PageHeader
        icon={UserCog}
        crumb={`HR · Shift Management · Schedule Assignment · ${sa.id}`}
        title={sa.employeeName ?? sa.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={sa.status} />
            <span>· {sa.shiftSchedule}</span>
          </span>
        }
        actions={
          <Link
            href={editHref}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        }
      />

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
                    `/employee/${encodeURIComponent(sa.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {sa.employeeName ?? sa.employee}
                </Link>
              ),
            },
            {
              label: "Schedule",
              value: (
                <Link
                  href={
                    `/hr/shift-management/schedules/${encodeURIComponent(sa.shiftSchedule)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {sa.shiftSchedule}
                </Link>
              ),
            },
            { label: "Start date", value: fmtDate(sa.startDate) },
            {
              label: "End date",
              value: sa.endDate ? fmtDate(sa.endDate) : "Open-ended",
            },
            { label: "Status", value: sa.status },
            { label: "Company", value: sa.company },
            { label: "Notes", value: sa.notes, wide: true },
          ]}
        />
      </section>

      <MaterialisePanel
        action={materialise}
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
      />

      <DeleteConfirm
        title={`Delete ${sa.id}`}
        description="Deletes this schedule assignment. Any Shift Assignments already materialised stay — delete those separately if you want them gone."
        action={onDelete}
      />
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

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

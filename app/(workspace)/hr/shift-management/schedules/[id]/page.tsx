import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { CalendarRange, ChevronLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DeleteConfirm } from "@/components/common/delete-confirm";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getShiftSchedule } from "@/lib/frappe/shift-schedules";
import { deleteShiftScheduleAction } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const s = await getShiftSchedule(decodeURIComponent(params.id));
  return {
    title: s ? `${s.scheduleName} · Schedule · Colossal HR` : "Schedule",
  };
}

export default async function ShiftScheduleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const sched = await getShiftSchedule(id);
  if (!sched) notFound();

  const onDelete = deleteShiftScheduleAction.bind(null, id);
  const editHref =
    `/hr/shift-management/schedules/${encodeURIComponent(id)}/edit` as Route;

  const daysOn = (
    [
      ["Mon", sched.monday],
      ["Tue", sched.tuesday],
      ["Wed", sched.wednesday],
      ["Thu", sched.thursday],
      ["Fri", sched.friday],
      ["Sat", sched.saturday],
      ["Sun", sched.sunday],
    ] as Array<[string, boolean]>
  ).filter(([, on]) => on).map(([l]) => l);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=schedules" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to schedules
      </Link>

      <PageHeader
        icon={CalendarRange}
        crumb={`HR · Shift Management · Schedule · ${sched.id}`}
        title={sched.scheduleName}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={sched.enabled ? "Enabled" : "Disabled"} />
            <span>· {sched.shiftType} · {daysOn.join(", ") || "no days"}</span>
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
          Configuration
        </h2>
        <FieldGrid
          fields={[
            { label: "Schedule name", value: sched.scheduleName },
            {
              label: "Shift type",
              value: (
                <Link
                  href={
                    `/hr/shift-management/types/${encodeURIComponent(sched.shiftType)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {sched.shiftType}
                </Link>
              ),
            },
            { label: "Company", value: sched.company },
            { label: "Holiday list", value: sched.holidayList },
            { label: "Active days", value: daysOn.join(", ") || "—" },
            { label: "Enabled", value: sched.enabled ? "Yes" : "No" },
            { label: "Notes", value: sched.notes, wide: true },
          ]}
        />
      </section>

      <DeleteConfirm
        title={`Delete ${sched.id}`}
        description="The system will refuse if any schedule assignment still points at this schedule."
        action={onDelete}
      />
    </div>
  );
}

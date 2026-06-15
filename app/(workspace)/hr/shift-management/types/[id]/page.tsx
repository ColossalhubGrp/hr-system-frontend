import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, MapPin, Pencil } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DeleteConfirm } from "@/components/common/delete-confirm";
import { FieldGrid } from "@/components/employee/field-grid";
import { getShiftType } from "@/lib/frappe/shifts";
import { deleteShiftTypeAction } from "../../actions";
import {
  classifyRange,
  fetchHolidayDates,
  type DayType,
} from "@/lib/frappe/day-rates";

const TONE: Record<DayType, string> = {
  Regular: "bg-ash-100 text-ash-700 ring-ash-200",
  Saturday: "bg-amber-100 text-amber-800 ring-amber-200",
  Sunday: "bg-ink-50 text-ink-800 ring-ink-100",
  Holiday: "bg-rise/10 text-rise ring-rise/20",
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const t = await getShiftType(decodeURIComponent(params.id));
  return { title: t ? `${t.id} · Shift type · Colossal HR` : "Shift type" };
}

export default async function ShiftTypeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const shift = await getShiftType(id);
  if (!shift) notFound();

  const policy = {
    regular: shift.regularDayMultiplier,
    saturday: shift.saturdayDayMultiplier,
    sunday: shift.sundayDayMultiplier,
    holiday: shift.holidayDayMultiplier,
  };
  const holidays = await fetchHolidayDates(shift.holidayList);
  const today = isoToday();
  const schedule = classifyRange(today, 14, holidays, policy);

  const editHref = `/hr/shift-management/types/${encodeURIComponent(id)}/edit` as Route;
  const onDelete = deleteShiftTypeAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to shifts
      </Link>

      <PageHeader
        icon={Clock}
        crumb={`HR · Shift Management · ${shift.id}`}
        title={shift.id}
        subtitle={
          shift.startTime && shift.endTime
            ? `${trimTime(shift.startTime)} → ${trimTime(shift.endTime)}`
            : "Hours not set"
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
            { label: "Start time", value: trimTime(shift.startTime) },
            { label: "End time", value: trimTime(shift.endTime) },
            { label: "Color", value: shift.color },
            { label: "Holiday list", value: shift.holidayList },
            {
              label: "Auto attendance",
              value: shift.enableAutoAttendance ? "Enabled" : "Disabled",
            },
            {
              label: "Allow check-out after end",
              value: shift.allowCheckOutAfterShiftEndTime ? "Yes" : "No",
            },
            {
              label: "Half-day if ≤",
              value:
                shift.workingHoursThresholdForHalfDay === null
                  ? null
                  : `${shift.workingHoursThresholdForHalfDay} h`,
            },
            {
              label: "Absent if ≤",
              value:
                shift.workingHoursThresholdForAbsent === null
                  ? null
                  : `${shift.workingHoursThresholdForAbsent} h`,
            },
          ]}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Allowed locations
        </h2>
        <p className="mb-4 text-xs text-ash-500">
          Geofence destinations checked when an employee punches in for this
          shift. Empty means no location restriction.
        </p>
        {shift.allowedLocations.length === 0 ? (
          <p className="text-sm text-ash-500">No locations linked.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {shift.allowedLocations.map((loc) => (
              <li key={loc}>
                <Link
                  href={
                    `/hr/shift-management/locations/${encodeURIComponent(loc)}` as Route
                  }
                  className="inline-flex items-center gap-1.5 rounded-chip border border-hairline bg-canvas px-3 py-1 text-xs font-medium text-ash-800 transition hover:bg-surface focus-ring"
                >
                  <MapPin className="h-3.5 w-3.5 text-ash-500" />
                  {loc}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Day-rate policy
        </h2>
        <p className="mb-5 text-xs text-ash-500">
          When a date matches multiple types, the highest-paid one applies.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RateTile label="Regular" multiplier={policy.regular} type="Regular" />
          <RateTile label="Saturday" multiplier={policy.saturday} type="Saturday" />
          <RateTile label="Sunday" multiplier={policy.sunday} type="Sunday" />
          <RateTile label="Holiday" multiplier={policy.holiday} type="Holiday" />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Overtime
        </h2>
        <p className="mb-5 text-xs text-ash-500">
          Hours worked past this shift's end time get the overtime multiplier
          instead of the day-rate one above. Shift window:{" "}
          {trimTime(shift.startTime) ?? "—"} → {trimTime(shift.endTime) ?? "—"}.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-1">
          <div className="rounded-card border border-hairline bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
              Past shift end
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">
              ×{shift.overtimeMultiplier.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Schedule preview · next 14 days
        </h2>
        <p className="mb-5 text-xs text-ash-500">
          {shift.holidayList
            ? `Holiday list: ${shift.holidayList}.`
            : "No holiday list linked — only Saturdays and Sundays will boost."}
        </p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {schedule.map((d) => (
            <li
              key={d.date}
              className={`rounded-card border border-hairline p-3 text-xs ${TONE[d.type]}`}
            >
              <p className="font-medium text-ash-900">{fmtShort(d.date)}</p>
              <p className="text-[11px] uppercase tracking-wide">
                {d.type}
              </p>
              <p className="mt-1 text-sm font-semibold">
                ×{d.multiplier.toFixed(2)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <DeleteConfirm
        title={`Delete ${shift.id}`}
        description="Removes the shift type from this site. Frappe will refuse if any assignment, request, or employee still references it — cancel or move those first."
        confirmTitle={`Permanently delete ${shift.id}?`}
        action={onDelete}
      />
    </div>
  );
}

function RateTile({
  label,
  multiplier,
  type,
}: {
  label: string;
  multiplier: number;
  type: DayType;
}) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">
        ×{multiplier.toFixed(2)}
      </p>
      <span
        className={`mt-3 inline-flex rounded-chip px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${TONE[type]}`}
      >
        {type}
      </span>
    </div>
  );
}

function trimTime(t: string | null): string | null {
  if (!t) return null;
  // Frappe returns either "09:00:00" or "9:00:00"; strip the trailing ":SS"
  // regardless of leading zero so we don't end up with "9:00:" trailing colon.
  return t.replace(/:\d{2}$/, "");
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtShort(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

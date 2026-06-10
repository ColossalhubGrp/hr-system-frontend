import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ActionPanel } from "@/components/common/action-bar";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getAttendance } from "@/lib/frappe/attendance-list";
import { getShiftType } from "@/lib/frappe/shifts";
import {
  dayType as classifyDay,
  effectiveMultiplier,
  fetchHolidayDates,
  DEFAULT_RATE_POLICY,
} from "@/lib/frappe/day-rates";
import {
  cancelAttendanceAction,
  submitAttendanceAction,
} from "../actions";

const ATT_TONES: Record<string, string> = {
  Present: "bg-rise/10 text-rise ring-rise/20",
  Absent: "bg-fall/10 text-fall ring-fall/20",
  "On Leave": "bg-ash-100 text-ash-700 ring-ash-200",
  "Half Day": "bg-amber-100 text-amber-800 ring-amber-200",
  "Work From Home": "bg-ink-50 text-ink-800 ring-ink-100",
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const a = await getAttendance(decodeURIComponent(params.id));
  return {
    title: a ? `${a.id} · Attendance · Colossal HR` : "Attendance · Colossal HR",
  };
}

export default async function AttendanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const a = await getAttendance(id);
  if (!a) notFound();

  // Pull the shift's rate policy (with holiday list) so we can classify this
  // attendance's date and surface the effective multiplier.
  const shift = a.shift ? await getShiftType(a.shift).catch(() => null) : null;
  const policy = shift
    ? {
        regular: shift.regularDayMultiplier,
        saturday: shift.saturdayDayMultiplier,
        sunday: shift.sundayDayMultiplier,
        holiday: shift.holidayDayMultiplier,
      }
    : DEFAULT_RATE_POLICY;
  const holidays = await fetchHolidayDates(shift?.holidayList);
  const dt = classifyDay(a.attendanceDate, holidays);
  const mult = effectiveMultiplier(dt, policy);

  const submit = submitAttendanceAction.bind(null, id);
  const cancel = cancelAttendanceAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/attendance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to attendance
      </Link>

      <PageHeader
        icon={CalendarCheck}
        crumb={`HR · Attendance · ${a.id}`}
        title={a.employeeName ?? a.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={a.status} tones={ATT_TONES} />
            <span>· {fmtDate(a.attendanceDate)}</span>
          </span>
        }
      />

      {a.docstatus === 0 && (
        <ActionPanel
          title="This attendance is a draft"
          description="Submit it to finalise — drafts don't roll into reports."
          label="Submit"
          pendingLabel="Submitting…"
          action={submit}
        />
      )}
      {a.docstatus === 1 && (
        <ActionPanel
          title="Cancel this attendance record"
          description="Cancellation keeps the audit trail; the row no longer counts."
          label="Cancel attendance"
          pendingLabel="Cancelling…"
          tone="danger"
          action={cancel}
        />
      )}

      <section className="card p-6">
        <div className="mb-5 flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Pay-rate classification
          </h2>
          <p className="text-xs text-ash-500">
            Based on{" "}
            {shift
              ? `the ${a.shift} policy`
              : "default policy (no shift linked)"}
            {shift?.holidayList ? ` and the “${shift.holidayList}” holiday list` : ""}
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <RateTile label="Day type" value={dt} />
          <RateTile label="Multiplier" value={`×${mult.toFixed(2)}`} highlight />
          {a.workingHours !== null && (
            <RateTile
              label="Weighted hours"
              value={`${(a.workingHours * mult).toFixed(2)} h`}
              hint={`${a.workingHours} h × ${mult.toFixed(2)}`}
            />
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Record
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
            { label: "Date", value: fmtDate(a.attendanceDate) },
            { label: "Status", value: a.status },
            { label: "Shift", value: a.shift },
            { label: "Check-in", value: a.inTime ?? null },
            { label: "Check-out", value: a.outTime ?? null },
            {
              label: "Working hours",
              value: a.workingHours === null ? null : `${a.workingHours} h`,
            },
            { label: "Late entry", value: a.lateEntry ? "Yes" : "No" },
            { label: "Early exit", value: a.earlyExit ? "Yes" : "No" },
            { label: "Company", value: a.company },
            { label: "Department", value: a.department },
          ]}
        />
      </section>
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

function RateTile({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-hairline bg-surface p-4 ${highlight ? "bg-ink-50/40 border-ink-100" : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold ${highlight ? "text-ink-800" : "text-ink-900"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ash-500">{hint}</p>}
    </div>
  );
}

import type {
  AttendanceDay,
  AttendanceStatus,
  AttendanceSummary,
} from "@/lib/frappe/attendance";
import { cn } from "@/lib/cn";

/**
 * Status → swatch colour. Mirrors the rest of the app's palette:
 *  - rise = present-equivalent
 *  - amber = half day (partial credit)
 *  - ink = WFH (counted but distinct)
 *  - fall = absent
 *  - ash = on leave (excused, not penalised)
 *  - blank cell = no record
 */
const STATUS_STYLE: Record<AttendanceStatus, string> = {
  Present: "bg-rise text-white",
  "Half Day": "bg-amber-400 text-amber-950",
  "Work From Home": "bg-ink-500 text-white",
  Absent: "bg-fall text-white",
  "On Leave": "bg-ash-300 text-ash-900",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  Present: "Present",
  Absent: "Absent",
  "On Leave": "On leave",
  "Half Day": "Half day",
  "Work From Home": "Work from home",
};

export function AttendanceStrip({
  summary,
}: {
  summary: AttendanceSummary;
}) {
  const rate = Math.round(summary.attendanceRate * 100);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Attendance rate" value={`${rate}%`} accent />
        <Stat label="Present" value={summary.counts.Present} />
        <Stat label="Absent" value={summary.counts.Absent} />
        <Stat label="On leave" value={summary.counts["On Leave"]} />
        <Stat
          label="WFH / half"
          value={summary.counts["Work From Home"] + summary.counts["Half Day"]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-ash-500">
          <span>
            Last {summary.windowDays} days · {summary.fromDate} →{" "}
            {summary.toDate}
          </span>
          <span>{summary.totalMarked} marked</span>
        </div>
        <Calendar days={summary.days} />
        <Legend />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-hairline bg-surface p-3 shadow-card",
        accent && "bg-ink-50/40 border-ink-100",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-ash-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold text-ink-900",
          accent && "text-ink-800",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Calendar({ days }: { days: AttendanceDay[] }) {
  return (
    <ol
      className="grid gap-1.5"
      style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
    >
      {days.map((d) => (
        <li
          key={d.date}
          title={`${d.date}${d.status ? " · " + STATUS_LABEL[d.status] : " · No record"}`}
          className={cn(
            "aspect-square min-h-[34px] rounded-xl border border-hairline text-[10px] font-medium flex items-center justify-center",
            d.status
              ? STATUS_STYLE[d.status]
              : "bg-canvas text-ash-400",
          )}
        >
          {new Date(d.date).getDate()}
        </li>
      ))}
    </ol>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ash-600">
      {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span
            className={cn("h-2.5 w-2.5 rounded-full", STATUS_STYLE[s])}
            aria-hidden
          />
          {STATUS_LABEL[s]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-canvas ring-1 ring-hairline" />
        No record
      </li>
    </ul>
  );
}

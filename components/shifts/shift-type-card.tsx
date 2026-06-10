import { Users, Zap } from "lucide-react";
import type { ShiftType } from "@/lib/frappe/shifts";

export function ShiftTypeCard({ shift }: { shift: ShiftType }) {
  const swatch = normaliseColor(shift.color);
  return (
    <article className="card flex flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-9 w-9 rounded-2xl border border-hairline"
            style={{ background: swatch }}
          />
          <div>
            <p className="text-sm font-semibold text-ink-900">{shift.name}</p>
            <p className="text-xs text-ash-500">
              {fmtRange(shift.startTime, shift.endTime)}
            </p>
          </div>
        </div>
        {shift.enableAutoAttendance && (
          <span className="inline-flex items-center gap-1 rounded-chip bg-rise/10 px-2 py-0.5 text-[10px] font-medium text-rise">
            <Zap className="h-3 w-3" />
            Auto attendance
          </span>
        )}
      </header>

      <footer className="flex items-center gap-2 text-sm text-ash-700">
        <Users className="h-4 w-4 text-ash-500" />
        <span className="font-medium">{shift.assignedCount}</span>
        <span className="text-ash-500">currently assigned</span>
      </footer>
    </article>
  );
}

function normaliseColor(c: string | null): string {
  if (!c) return "#E6E8EE";
  if (c.startsWith("#")) return c;
  // Frappe sometimes stores "primary"/"orange" — fall back to the hairline gray.
  return "#E6E8EE";
}

function fmtRange(start: string | null, end: string | null): string {
  if (!start || !end) return "Hours not set";
  return `${trim(start)} → ${trim(end)}`;
}

function trim(t: string): string {
  // Frappe times come as "09:00:00" — show "09:00".
  return t.length >= 5 ? t.slice(0, 5) : t;
}

import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, LogIn } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getCheckin } from "@/lib/frappe/attendance-list";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const c = await getCheckin(decodeURIComponent(params.id));
  return {
    title: c ? `${c.id} · Check-in · Colossal HR` : "Check-in · Colossal HR",
  };
}

export default async function CheckinDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const c = await getCheckin(id);
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/attendance?tab=checkins" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to check-ins
      </Link>

      <PageHeader
        icon={LogIn}
        crumb={`HR · Attendance · Check-in · ${c.id}`}
        title={c.employeeName ?? c.employee}
        subtitle={
          <StatusPill
            status={c.logType}
            tones={{
              IN: "bg-rise/10 text-rise ring-rise/20",
              OUT: "bg-amber-100 text-amber-800 ring-amber-200",
            }}
          />
        }
      />

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Punch
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Employee",
              value: (
                <Link
                  href={
                    `/employee/${encodeURIComponent(c.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {c.employeeName ?? c.employee}
                </Link>
              ),
            },
            { label: "Log type", value: c.logType },
            { label: "Time", value: c.time },
            { label: "Shift", value: c.shift },
            { label: "Device", value: c.device },
            { label: "Attendance", value: c.attendance },
            {
              label: "Skip auto-attendance",
              value: c.skipAutoAttendance ? "Yes" : "No",
            },
            {
              label: "Latitude",
              value: c.latitude === null ? null : c.latitude.toString(),
            },
            {
              label: "Longitude",
              value: c.longitude === null ? null : c.longitude.toString(),
            },
          ]}
        />
      </section>
    </div>
  );
}

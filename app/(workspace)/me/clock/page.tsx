import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ClockPanel } from "@/components/me/clock-panel";
import {
  getClockInEmployee,
  getLastCheckinToday,
} from "@/lib/frappe/checkin";
import { clockInOrOutAction } from "./actions";

export const metadata = { title: "Clock in · Colossal HR" };

export default async function ClockPage() {
  const emp = await getClockInEmployee();

  if (!emp) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="card p-8">
          <Clock className="mx-auto h-10 w-10 text-ash-400" />
          <h1 className="mt-3 text-lg font-semibold text-ink-900">
            Can't clock in
          </h1>
          <p className="mt-2 text-sm text-ash-700">
            Your account isn't linked to an Employee record. Ask HR to set
            the User on your Employee profile, then come back.
          </p>
          <Link
            href={"/me" as Route}
            className="mt-5 inline-flex h-9 items-center rounded-chip border border-hairline bg-surface px-4 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
          >
            Back to my workspace
          </Link>
        </div>
      </div>
    );
  }

  const last = await getLastCheckinToday(emp.id);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <Link
        href={"/me" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to my workspace
      </Link>

      <PageHeader
        icon={Clock}
        crumb="My workspace · Clock in"
        title="Clock in / out"
        subtitle={`Record an attendance event for ${emp.name}.`}
      />

      <section className="card p-6">
        <ClockPanel
          action={clockInOrOutAction}
          lastDirection={last?.logType ?? null}
          geofenceExempt={emp.geofenceExempt}
          defaultShift={emp.defaultShift}
        />
      </section>
    </div>
  );
}

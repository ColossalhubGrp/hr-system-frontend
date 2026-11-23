import Link from "next/link";
import type { Route } from "next";
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ListChecks,
  ReceiptText,
  Target,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { InlineClock } from "@/components/me/inline-clock";
import { frappeCall } from "@/lib/frappe/client";
import { clockInOrOutAction } from "./clock/actions";
import { SecurityCard } from "@/components/me/security-card";

export const metadata = { title: "My workspace · Colossal Hub" };

type EmployeeMini = {
  name: string;
  employee_name: string | null;
  designation: string | null;
  department: string | null;
  company: string | null;
  geofence_exempt: 0 | 1 | boolean | null;
  default_shift: string | null;
};

async function getMyEmployee(): Promise<EmployeeMini | null> {
  try {
    const emp = await frappeCall<EmployeeMini & { name?: string }>({
      method: "recruitment_app.api.self_service.my_employee",
      as: "user",
    });
    return emp?.name ? emp : null;
  } catch {
    return null;
  }
}

type MyDashboard = {
  linked: boolean;
  attendance: { status: string | null; in_time: string | null; out_time: string | null } | null;
  last_checkin: { log_type: "IN" | "OUT" | null; time: string | null } | null;
  open_leave: number;
  open_goals: number;
};

async function getMyDashboard(): Promise<MyDashboard | null> {
  try {
    return await frappeCall<MyDashboard>({
      method: "recruitment_app.api.self_service.my_dashboard",
      as: "user",
    });
  } catch {
    return null;
  }
}

export default async function MyWorkspacePage() {
  const emp = await getMyEmployee();

  if (!emp) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="card p-8">
          <UserRound className="mx-auto h-10 w-10 text-ash-400" />
          <h1 className="mt-3 text-lg font-semibold text-ash-900">
            No employee record linked
          </h1>
          <p className="mt-2 text-sm text-ash-700">
            Your account isn't linked to an Employee record yet. Ask HR to set
            the User on your Employee record so you can clock in and access
            self-service.
          </p>
        </div>
      </div>
    );
  }

  const dash = await getMyDashboard();
  const att = dash?.attendance
    ? {
        status: dash.attendance.status,
        inTime: dash.attendance.in_time,
        outTime: dash.attendance.out_time,
      }
    : null;
  const lastCheckin = dash?.last_checkin
    ? { logType: dash.last_checkin.log_type }
    : null;
  const pendingLeaves = dash?.open_leave ?? 0;
  const openGoals = dash?.open_goals ?? 0;

  const profileHref = `/employee/${encodeURIComponent(emp.name)}` as Route;
  // Employee Checkin is the immediate signal — Attendance is a
  // separate DocType populated by nightly consolidation, so we can't
  // rely on it to reflect a punch that happened seconds ago. Prefer
  // checkin state; fall back to Attendance for the rare case where
  // consolidation ran but no checkin row exists (e.g. manual entry).
  const initialClockState: "in" | "out" | "none" =
    lastCheckin?.logType === "IN"
      ? "in"
      : lastCheckin?.logType === "OUT"
        ? "out"
        : att?.inTime && !att?.outTime
          ? "in"
          : att?.outTime
            ? "out"
            : "none";
  const todaysStatusValue = att?.status
    ? att.status
    : lastCheckin?.logType === "IN"
      ? "Clocked in"
      : lastCheckin?.logType === "OUT"
        ? "Clocked out"
        : "Not marked";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={UserRound}
        crumb="My workspace"
        title={`Hi ${(emp.employee_name ?? "there").split(" ")[0]}`}
        subtitle={[emp.designation, emp.department].filter(Boolean).join(" · ")}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <section className="card flex flex-col gap-3 p-4 lg:col-span-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ash-500">
              Today
            </h2>
            <p className="text-[11px] text-ash-500">
              {initialClockState === "in"
                ? "You're currently clocked in."
                : initialClockState === "out"
                  ? "You clocked out earlier today."
                  : "You haven't clocked in yet today."}
            </p>
          </div>
          <InlineClock
            action={clockInOrOutAction}
            geofenceExempt={Boolean(emp.geofence_exempt)}
            defaultShift={emp.default_shift}
            initialState={initialClockState}
          />
        </section>
        <SummaryTile
          label="Open leave requests"
          value={pendingLeaves.toString()}
          icon={CalendarDays}
          tone={pendingLeaves > 0 ? "amber" : "ink"}
          compact
        />
        <SummaryTile
          label="Open goals"
          value={openGoals.toString()}
          icon={Target}
          tone="ink"
          compact
        />
        <SummaryTile
          label="Today's status"
          value={todaysStatusValue}
          icon={CalendarCheck}
          tone={
            att?.status === "Present" || todaysStatusValue === "Clocked in"
              ? "rise"
              : "ash"
          }
          compact
        />
      </div>

      <ActionsTable
        rows={[
          {
            href: `/me/leave/new`,
            title: "Apply for leave",
            description: "Pick dates, attach a note, and route it to your approver.",
            icon: CalendarDays,
          },
          {
            href: profileHref,
            title: "My profile",
            description: "View your designation, contact info, and shift policy.",
            icon: UserRound,
          },
          {
            href: `/me/payslips`,
            title: "My payslips",
            description: "Recent salary slips, with downloads when available.",
            icon: ReceiptText,
          },
          {
            href: `/me/goals`,
            title: "My goals",
            description: "Track open goals + key results for the active cycle.",
            icon: ListChecks,
          },
          {
            href: (profileHref + "?tab=attendance") as Route,
            title: "My attendance",
            description: "Last 28 days of check-ins, status, and policy.",
            icon: CalendarCheck,
          },
        ]}
      />

      <SecurityCard />
    </div>
  );
}

type ActionRow = {
  href: Route | string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

function ActionsTable({ rows }: { rows: ActionRow[] }) {
  return (
    <section className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-hairline text-[10px] uppercase tracking-wide text-ash-500">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Shortcut</th>
            <th className="px-4 py-2 text-left font-semibold">Description</th>
            <th className="px-4 py-2 text-right font-semibold" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <tr
                key={r.title}
                className="group border-b border-hairline last:border-b-0 transition hover:bg-canvas/50"
              >
                <td className="px-4 py-3 align-top font-medium">
                  <Link
                    href={r.href as Route}
                    className="flex items-center gap-2 text-ash-900 hover:underline"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top text-xs text-ash-600">
                  <Link href={r.href as Route} className="block">
                    {r.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Link
                    href={r.href as Route}
                    className="inline-flex text-ash-400 group-hover:text-ash-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}



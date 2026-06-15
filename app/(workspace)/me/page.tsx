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
import { readSession } from "@/lib/frappe/session";
import { frappeCall } from "@/lib/frappe/client";
import { clockInOrOutAction } from "./clock/actions";

export const metadata = { title: "My workspace · Colossal HR" };

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
  const session = readSession();
  if (!session.userId) return null;
  try {
    // Frappe v15 only allows in_list_view fields here, so we resolve `name`
    // first and then read the rest of the doc via frappe.client.get.
    type Row = { name: string };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name"],
        filters: JSON.stringify([["user_id", "=", session.userId]]),
        limit_page_length: 1,
      },
      as: "user",
    });
    const id = rows[0]?.name;
    if (!id) return null;

    return await frappeCall<EmployeeMini>({
      method: "frappe.client.get",
      args: { doctype: "Employee", name: id },
      as: "user",
    });
  } catch {
    return null;
  }
}

async function todaysAttendance(employeeId: string): Promise<{
  status: string | null;
  inTime: string | null;
  outTime: string | null;
} | null> {
  const today = isoToday();
  try {
    type Row = {
      name: string;
      status: string | null;
      in_time: string | null;
      out_time: string | null;
    };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Attendance",
        fields: ["name", "status", "in_time", "out_time"],
        filters: JSON.stringify([
          ["employee", "=", employeeId],
          ["attendance_date", "=", today],
        ]),
        order_by: "modified desc",
        limit_page_length: 1,
      },
      as: "user",
    });
    const r = rows[0];
    return r
      ? { status: r.status, inTime: r.in_time, outTime: r.out_time }
      : null;
  } catch {
    return null;
  }
}

async function pendingLeaveCount(employeeId: string): Promise<number> {
  try {
    return await frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Leave Application",
        filters: JSON.stringify([
          ["employee", "=", employeeId],
          ["status", "=", "Open"],
        ]),
      },
      as: "user",
    });
  } catch {
    return 0;
  }
}

async function openGoalCount(employeeId: string): Promise<number> {
  try {
    return await frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Goal",
        filters: JSON.stringify([
          ["employee", "=", employeeId],
          ["status", "in", ["In Progress", "Pending"]],
        ]),
      },
      as: "user",
    });
  } catch {
    return 0;
  }
}

export default async function MyWorkspacePage() {
  const emp = await getMyEmployee();

  if (!emp) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="card p-8">
          <UserRound className="mx-auto h-10 w-10 text-ash-400" />
          <h1 className="mt-3 text-lg font-semibold text-ink-900">
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

  const [att, pendingLeaves, openGoals] = await Promise.all([
    todaysAttendance(emp.name),
    pendingLeaveCount(emp.name),
    openGoalCount(emp.name),
  ]);

  const profileHref = `/employee/${encodeURIComponent(emp.name)}` as Route;
  const initialClockState: "in" | "out" | "none" =
    att?.inTime && !att?.outTime ? "in" : att?.outTime ? "out" : "none";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={UserRound}
        crumb="My workspace"
        title={`Hi ${(emp.employee_name ?? "there").split(" ")[0]}`}
        subtitle={[emp.designation, emp.department].filter(Boolean).join(" · ")}
      />

      <section className="card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Today
          </h2>
          <p className="text-xs text-ash-500">
            {initialClockState === "in"
              ? "You're currently clocked in."
              : initialClockState === "out"
                ? "You clocked out earlier today."
                : "You haven't clocked in yet today."}
          </p>
        </div>

        <div className="mt-4">
          <InlineClock
            action={clockInOrOutAction}
            geofenceExempt={Boolean(emp.geofence_exempt)}
            defaultShift={emp.default_shift}
            initialState={initialClockState}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Open leave requests"
          value={pendingLeaves.toString()}
          icon={CalendarDays}
          tone={pendingLeaves > 0 ? "amber" : "ink"}
        />
        <SummaryTile
          label="Open goals"
          value={openGoals.toString()}
          icon={Target}
          tone="ink"
        />
        <SummaryTile
          label="Today's status"
          value={att?.status ?? "Not marked"}
          icon={CalendarCheck}
          tone={att?.status === "Present" ? "rise" : "ash"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href={`/me/leave/new`}
          title="Apply for leave"
          description="Pick dates, attach a note, and route it to your approver."
          icon={CalendarDays}
        />
        <ActionCard
          href={profileHref}
          title="My profile"
          description="View your designation, contact info, and shift policy."
          icon={UserRound}
        />
        <ActionCard
          href={`/me/payslips`}
          title="My payslips"
          description="Recent salary slips, with downloads when available."
          icon={ReceiptText}
        />
        <ActionCard
          href={`/me/goals`}
          title="My goals"
          description="Track open goals + key results for the active cycle."
          icon={ListChecks}
        />
        <ActionCard
          href={profileHref + "?tab=attendance"}
          title="My attendance"
          description="Last 28 days of check-ins, status, and policy."
          icon={CalendarCheck}
        />
      </div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: Route | string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href as Route}
      className="card flex items-start gap-3 p-5 transition hover:border-ink-200 hover:shadow-card focus-ring"
    >
      <Icon className="mt-0.5 h-5 w-5 text-ink-700" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-1 text-xs text-ash-600">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-ash-400" />
    </Link>
  );
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


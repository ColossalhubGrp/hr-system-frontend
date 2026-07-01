import { notFound } from "next/navigation";
import { EmployeeHeader } from "@/components/employee/employee-header";
import {
  EMPLOYEE_TABS,
  EmployeeTabs,
  isEmployeeTab,
  type EmployeeTabId,
} from "@/components/employee/employee-tabs";
import { FieldGrid } from "@/components/employee/field-grid";
import { AttendanceStrip } from "@/components/employee/attendance-strip";
import { GeofenceToggle } from "@/components/employee/geofence-toggle";
import { ConvertToAlumniButton } from "@/components/employee/convert-to-alumni";
import { fetchEmployeeAttendance } from "@/lib/frappe/attendance";
import { getEmployee, type EmployeeFull } from "@/lib/frappe/employees";
import { getMyAccess } from "@/lib/frappe/roles";
import { readSession } from "@/lib/frappe/session";
import { hasApp } from "@/lib/subscriptions/server";
import { EmployeePayrollSection } from "@/components/payroll/employee-payroll-section";
import { redirect } from "next/navigation";
import {
  convertToAlumniAction,
  setEmployeeGeofenceExemptAction,
} from "./actions";

type SP = { tab?: string };

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const emp = await getEmployee(decodeURIComponent(params.id));
  return {
    title: emp ? `${emp.name} · Colossal HR` : "Employee · Colossal HR",
  };
}

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SP;
}) {
  const id = decodeURIComponent(params.id);
  const emp = await getEmployee(id);
  if (!emp) notFound();

  // Access control: HR (HR_ANY) can view anyone; non-HR users can only view
  // their OWN profile. Redirect to /forbidden otherwise so the user sees a
  // clear explanation (not a 404).
  const session = readSession();
  const access = await getMyAccess();
  const isOwn = Boolean(
    session.userId && emp.userId && session.userId === emp.userId,
  );
  if (!access.isHrAny && !isOwn) {
    redirect(
      `/forbidden?need=HR_ANY&from=${encodeURIComponent(`/employee/${id}`)}`,
    );
  }

  const activeTab: EmployeeTabId = isEmployeeTab(searchParams.tab)
    ? searchParams.tab
    : "overview";
  const basePath = `/employee/${encodeURIComponent(id)}`;

  // Attendance is the only tab that needs an extra fetch, and only when
  // selected — avoids paying for it on every detail-page view.
  const attendance =
    activeTab === "attendance"
      ? await fetchEmployeeAttendance(emp.id, 28).catch(() => null)
      : null;

  // Salary tab: 3-state matrix per the subscription-tier-separation
  // memory rule.
  //   • not subscribed → "subscription tier" placeholder
  //   • subscribed + viewer is the employee themselves OR payroll
  //     reviewer/admin → render EmployeePayrollSection (self-service)
  //   • subscribed + HR-but-not-payroll viewer → small stub; never
  //     leak comp to non-payroll HR by default
  const hasPayroll = activeTab === "salary" ? await hasApp("payroll") : false;
  const canSeePay =
    hasPayroll && (isOwn || access.isPayrollAdmin || access.isPayrollReviewer);

  // `access` was resolved during the role check above; reuse it for the
  // geofence-editor visibility on the Attendance tab.
  return (
    <div className="flex flex-col gap-5">
      <EmployeeHeader
        emp={emp}
        canIssueLetters={access.isHrAny}
        canEdit={access.isHrAny}
      />
      <EmployeeTabs basePath={basePath} active={activeTab} />
      <TabPanel
        id={activeTab}
        emp={emp}
        attendance={attendance}
        canEditGeofence={access.isShiftAdmin}
        canConvertToAlumni={access.isHrAdmin || access.isItAdmin}
        hasPayroll={hasPayroll}
        canSeePay={canSeePay}
        isOwnRecord={isOwn}
      />
    </div>
  );
}

type TabPanelProps = {
  id: EmployeeTabId;
  emp: EmployeeFull;
  attendance: Awaited<ReturnType<typeof fetchEmployeeAttendance>> | null;
  canEditGeofence: boolean;
  canConvertToAlumni: boolean;
  hasPayroll: boolean;
  canSeePay: boolean;
  isOwnRecord: boolean;
};

function TabPanel({
  id,
  emp,
  attendance,
  canEditGeofence,
  canConvertToAlumni,
  hasPayroll,
  canSeePay,
  isOwnRecord,
}: TabPanelProps) {
  const tab = EMPLOYEE_TABS.find((t) => t.id === id);
  return (
    <section
      role="tabpanel"
      aria-label={tab?.label}
      className="card p-6"
    >
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
        {tab?.label}
      </h2>
      {renderTab(id, emp, attendance, canEditGeofence, canConvertToAlumni, hasPayroll, canSeePay, isOwnRecord)}
    </section>
  );
}

function renderTab(
  id: EmployeeTabId,
  emp: EmployeeFull,
  attendance: TabPanelProps["attendance"],
  canEditGeofence: boolean,
  canConvertToAlumni: boolean,
  hasPayroll: boolean,
  canSeePay: boolean,
  isOwnRecord: boolean,
): React.ReactNode {
  switch (id) {
    case "overview":
      return (
        <FieldGrid
          fields={[
            { label: "Full name", value: emp.name },
            { label: "Employee ID", value: emp.id },
            { label: "Designation", value: emp.designation },
            { label: "Department", value: emp.department },
            { label: "Branch", value: emp.branch },
            { label: "Company", value: emp.company },
            { label: "Gender", value: emp.gender },
            { label: "Date of birth", value: fmtDate(emp.dateOfBirth) },
            { label: "Date of joining", value: fmtDate(emp.dateOfJoining) },
            { label: "Status", value: emp.status },
            { label: "Bio", value: emp.bio, wide: true },
          ]}
        />
      );
    case "joining":
      return (
        <FieldGrid
          fields={[
            { label: "Date of joining", value: fmtDate(emp.dateOfJoining) },
            { label: "Employee number", value: emp.employeeNumber },
            { label: "Employment type", value: emp.employmentType },
            { label: "Pay grade", value: emp.payGrade },
            { label: "Default shift", value: emp.defaultShift },
            { label: "Holiday list", value: emp.holidayList },
            { label: "Date of retirement", value: fmtDate(emp.dateOfRetirement) },
            // Zimbabwe statutory IDs (Phase 5) — required before payroll
            // can run for this employee.
            { label: "National ID", value: emp.nationalId },
            { label: "ZIMRA tax number", value: emp.taxNumber },
            { label: "NSSA number", value: emp.nssaNumber },
          ]}
        />
      );
    case "contact":
      return (
        <FieldGrid
          fields={[
            { label: "Company email", value: emp.email },
            { label: "Personal email", value: emp.personalEmail },
            { label: "Mobile", value: emp.mobile },
            { label: "Linked user account", value: emp.userId },
            { label: "Current address", value: emp.currentAddress, wide: true },
            { label: "Permanent address", value: emp.permanentAddress, wide: true },
            { label: "Emergency contact", value: emp.emergencyContactName },
            { label: "Emergency phone", value: emp.emergencyContactNumber },
            // Bank — used for EFT payouts
            { label: "Paying bank", value: emp.bankName },
            { label: "Bank account", value: emp.bankAccount },
          ]}
        />
      );
    case "attendance": {
      const geofenceAction = setEmployeeGeofenceExemptAction.bind(null, emp.id);
      return (
        <div className="flex flex-col gap-6">
          <FieldGrid
            fields={[
              { label: "Default shift", value: emp.defaultShift },
              { label: "Holiday list", value: emp.holidayList },
            ]}
          />
          <GeofenceToggle
            action={geofenceAction}
            current={emp.geofenceExempt}
            canEdit={canEditGeofence}
          />
          {attendance ? (
            <AttendanceStrip summary={attendance} />
          ) : (
            <Placeholder>
              Couldn't load attendance records for this employee. They might
              not have any marked yet, or your role doesn't include Attendance
              read access.
            </Placeholder>
          )}
        </div>
      );
    }
    case "approvers":
      return (
        <FieldGrid
          fields={[
            { label: "Reports to", value: emp.reportsTo },
            { label: "Expense approver", value: emp.expenseApprover },
            { label: "Leave approver", value: emp.leaveApprover },
            { label: "Shift request approver", value: emp.shiftRequestApprover },
          ]}
        />
      );
    case "salary":
      if (!hasPayroll) {
        return (
          <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.04] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              Payroll is a separate subscription
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Colossal HR keeps People data free of compensation. To see
              {" "}<strong>{emp.name}</strong>&apos;s pay structure, tax
              settings, and payslip history, subscribe to the Payroll
              module.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <a
                href="/admin/billing"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Subscribe to Payroll
              </a>
              <a
                href="mailto:sales@colossal.hr?subject=Payroll subscription"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
              >
                Talk to sales
              </a>
            </div>
          </div>
        );
      }
      if (!canSeePay) {
        return (
          <Placeholder>
            Pay details for {emp.name} are managed by the payroll team.
            You don't have access to view them.
          </Placeholder>
        );
      }
      return (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
              Pay structure (Zimbabwe)
            </h3>
            <FieldGrid
              fields={[
                { label: "Monthly basic (USD)", value: emp.basicUsd ? fmtUsd(emp.basicUsd) : null },
                { label: "Monthly basic (ZiG)", value: emp.basicZig ? fmtZig(emp.basicZig) : null },
                { label: "Pension %", value: emp.pensionPct ? `${emp.pensionPct}%` : null },
                { label: "Medical aid (USD)", value: emp.medicalAidUsd ? fmtUsd(emp.medicalAidUsd) : null },
                { label: "NEC dues (USD)", value: emp.necDuesUsd ? fmtUsd(emp.necDuesUsd) : null },
                { label: "NEC industry", value: emp.necIndustry },
                { label: "Pay grade", value: emp.payGrade },
                { label: "Pay point", value: emp.payPoint },
              ]}
            />
          </div>
          <EmployeePayrollSection employeeId={emp.id} selfService={isOwnRecord} />
        </div>
      );
    case "profile":
      return (
        <FieldGrid
          fields={[
            { label: "Bio", value: emp.bio, wide: true },
            { label: "Gender", value: emp.gender },
            { label: "Date of birth", value: fmtDate(emp.dateOfBirth) },
          ]}
        />
      );
    case "exit": {
      const convertAction = convertToAlumniAction.bind(null, emp.id);
      const today = new Date(2026, 5, 13).toISOString().slice(0, 10);
      return (
        <div className="flex flex-col gap-6">
          <FieldGrid
            fields={[
              { label: "Status", value: emp.status },
              { label: "Relieving date", value: fmtDate(emp.relievingDate) },
            ]}
          />
          {canConvertToAlumni && (
            <div className="rounded-card border border-fall/25 bg-fall/[0.04] p-5">
              <h3 className="text-sm font-semibold text-fall">Danger zone</h3>
              <p className="mt-1 text-xs text-ash-700">
                Converting to Alumni revokes every active role, sets the
                employee status to Left, and gives the person access to the
                read-only alumni portal at <code>/alumni/login</code> only.
                Use this when finalising an exit.
              </p>
              <div className="mt-4">
                <ConvertToAlumniButton
                  action={convertAction}
                  employeeId={emp.id}
                  employeeName={emp.name}
                  linkedUser={emp.userId}
                  currentStatus={emp.status}
                  defaultRelievingDate={emp.relievingDate ?? today}
                />
              </div>
            </div>
          )}
        </div>
      );
    }
  }
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-4 py-6 text-sm text-ash-600">
      {children}
    </p>
  );
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtUsd(n: number): string {
  return `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtZig(n: number): string {
  return `ZiG ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
};

function TabPanel({
  id,
  emp,
  attendance,
  canEditGeofence,
  canConvertToAlumni,
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
      {renderTab(id, emp, attendance, canEditGeofence, canConvertToAlumni)}
    </section>
  );
}

function renderTab(
  id: EmployeeTabId,
  emp: EmployeeFull,
  attendance: TabPanelProps["attendance"],
  canEditGeofence: boolean,
  canConvertToAlumni: boolean,
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
            { label: "Grade", value: emp.grade },
            { label: "Default shift", value: emp.defaultShift },
            { label: "Holiday list", value: emp.holidayList },
            { label: "Date of retirement", value: fmtDate(emp.dateOfRetirement) },
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
      return (
        <Placeholder>
          Payroll is a separate subscription tier — Colossal HR keeps base
          People data free of compensation. We'll surface the structure here
          when the customer enables payroll.
        </Placeholder>
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

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
import { fetchEmployeeAttendance } from "@/lib/frappe/attendance";
import {
  getEmployee,
  getEmployeeSkillMap,
  type EmployeeFull,
  type EmployeeSkillMap,
} from "@/lib/frappe/employees";
import { getMyAccess } from "@/lib/frappe/roles";
import { readSession } from "@/lib/frappe/session";
import { redirect } from "next/navigation";
import { setEmployeeGeofenceExemptAction } from "./actions";

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

  // Tabs that need an extra fetch (only when active — avoids paying for
  // them on every detail-page view).
  const attendance =
    activeTab === "attendance"
      ? await fetchEmployeeAttendance(emp.id, 28).catch(() => null)
      : null;
  const skillMap =
    activeTab === "skills"
      ? await getEmployeeSkillMap(emp.id).catch(() => null)
      : null;

  // `access` was resolved during the role check above; reuse it for the
  // geofence-editor visibility on the Attendance tab.
  return (
    <div className="flex flex-col gap-5">
      <EmployeeHeader
        emp={emp}
        canIssueLetters={access.isHrAny}
        canEdit={access.isHrAny}
        // Non-HR viewers only reach this page for their OWN profile
        // (via the /me shortcut) — send them back to /me rather than
        // /employee (which they'd get bounced from anyway).
        backHref={isOwn && !access.isHrAny ? "/me" : "/employee"}
        backLabel={
          isOwn && !access.isHrAny ? "Back to my workspace" : "Back to directory"
        }
      />
      <EmployeeTabs basePath={basePath} active={activeTab} />
      <TabPanel
        id={activeTab}
        emp={emp}
        attendance={attendance}
        skillMap={skillMap}
        canEditGeofence={access.isShiftAdmin}
      />
    </div>
  );
}

type TabPanelProps = {
  id: EmployeeTabId;
  emp: EmployeeFull;
  attendance: Awaited<ReturnType<typeof fetchEmployeeAttendance>> | null;
  skillMap: EmployeeSkillMap;
  canEditGeofence: boolean;
};

function TabPanel({
  id,
  emp,
  attendance,
  skillMap,
  canEditGeofence,
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
      {renderTab(id, emp, attendance, skillMap, canEditGeofence)}
    </section>
  );
}

function renderTab(
  id: EmployeeTabId,
  emp: EmployeeFull,
  attendance: TabPanelProps["attendance"],
  skillMap: EmployeeSkillMap,
  canEditGeofence: boolean,
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
    case "education":
      if (emp.education.length === 0) {
        return <Placeholder>No education records on file yet.</Placeholder>;
      }
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-hairline text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <Th>School / University</Th>
                <Th>Qualification</Th>
                <Th>Level</Th>
                <Th className="text-right">Year</Th>
                <Th>Class / Grade</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {emp.education.map((r, i) => (
                <tr key={`edu-${i}`}>
                  <Td wrap>{r.schoolUniversity}</Td>
                  <Td>{r.qualification}</Td>
                  <Td>{r.level}</Td>
                  <Td className="text-right">{r.yearOfCompletion}</Td>
                  <Td>{r.classGrade}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "experience": {
      const hasExternal = emp.externalWorkHistory.length > 0;
      const hasInternal = emp.internalWorkHistory.length > 0;
      if (!hasExternal && !hasInternal) {
        return <Placeholder>No work history on file yet.</Placeholder>;
      }
      return (
        <div className="flex flex-col gap-8">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ash-700">Previous employers (external)</h3>
            {hasExternal ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-hairline text-sm">
                  <thead className="text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                    <tr>
                      <Th>Company</Th>
                      <Th>Job title</Th>
                      <Th className="text-right">Salary</Th>
                      <Th>Total experience</Th>
                      <Th>Contact</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {emp.externalWorkHistory.map((r, i) => (
                      <tr key={`ext-${i}`}>
                        <Td>{r.company}</Td>
                        <Td>{r.jobTitle}</Td>
                        <Td className="text-right">{r.salary != null ? r.salary.toLocaleString() : null}</Td>
                        <Td>{r.totalExperience}</Td>
                        <Td>{r.contact}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Placeholder>No external work history on file yet.</Placeholder>
            )}
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ash-700">
              Moves within the company <span className="font-normal text-ash-500">(added automatically after transfers and promotions)</span>
            </h3>
            {hasInternal ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-hairline text-sm">
                  <thead className="text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                    <tr>
                      <Th>Branch</Th>
                      <Th>Department</Th>
                      <Th>Job title</Th>
                      <Th>From</Th>
                      <Th>To</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {emp.internalWorkHistory.map((r, i) => (
                      <tr key={`int-${i}`}>
                        <Td>{r.branch}</Td>
                        <Td>{r.department}</Td>
                        <Td>{r.jobTitle}</Td>
                        <Td>{fmtDate(r.fromDate)}</Td>
                        <Td>{fmtDate(r.toDate) ?? <span className="text-ash-500">present</span>}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Placeholder>No internal history yet — this fills in as the employee moves between roles.</Placeholder>
            )}
          </section>
        </div>
      );
    }
    case "skills": {
      const hasSkills = emp.skills.length > 0;
      const hasSkillMap = skillMap && (skillMap.employeeSkills.length > 0 || skillMap.trainings.length > 0);
      if (!hasSkills && !hasSkillMap) {
        return <Placeholder>No skills recorded yet.</Placeholder>;
      }
      return (
        <div className="flex flex-col gap-8">
          {hasSkills && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-ash-700">Skills</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-hairline text-sm">
                  <thead className="text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                    <tr>
                      <Th>Skill</Th>
                      <Th>Proficiency</Th>
                      <Th>Evaluated on</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {emp.skills.map((r, i) => (
                      <tr key={`sk-${i}`}>
                        <Td>{r.skill}</Td>
                        <Td>{r.proficiency != null ? `${r.proficiency} / 5` : null}</Td>
                        <Td>{fmtDate(r.evaluationDate)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {skillMap && skillMap.trainings.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-ash-700">
                Trainings <span className="font-normal text-ash-500">(from the employee's skill profile)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-hairline text-sm">
                  <thead className="text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                    <tr>
                      <Th>Training</Th>
                      <Th>From</Th>
                      <Th>To</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {skillMap.trainings.map((t, i) => (
                      <tr key={`tr-${i}`}>
                        <Td>{t.training}</Td>
                        <Td>{fmtDate(t.fromDate)}</Td>
                        <Td>{fmtDate(t.toDate)}</Td>
                        <Td>{t.status}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      );
    }
  }
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th scope="col" className={`px-3 py-2 ${className ?? ""}`}>{children}</th>;
}

function Td({
  children,
  className,
  wrap,
}: {
  children: React.ReactNode;
  className?: string;
  wrap?: boolean;
}) {
  return (
    <td className={`px-3 py-2 text-ash-700 ${wrap ? "whitespace-normal" : "whitespace-nowrap"} ${className ?? ""}`}>
      {children ?? <span className="text-ash-400">—</span>}
    </td>
  );
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

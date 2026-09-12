import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, Plane } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SubTabs } from "@/components/common/sub-tabs";
import { EmptyState } from "@/components/common/list-shell";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  listCompensatoryLeaveRequests,
  listLeaveAllocations,
  listLeaveEncashments,
  listLeaveLedgerEntries,
  listLeavePeriods,
  listLeavePolicyAssignments,
} from "@/lib/frappe/leave-admin";
import { listLeaveTypes } from "@/lib/frappe/leave-types";
import { listLeavePolicies } from "@/lib/frappe/leave-policies";
import { listCompanies } from "@/lib/frappe/lookups";
import {
  listAttendableEmployees,
  listBranches,
  listDepartments,
} from "@/lib/frappe/attendance-bulk";
import { LeaveAdminHub } from "@/components/leaves/admin-hub";

export const metadata = { title: "Leave admin · Colossal HR" };

type SP = { tab?: string };

type Tab =
  | "allocations"
  | "policy-assignments"
  | "encashments"
  | "comp-requests"
  | "control-panel"
  | "ledger";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "allocations", label: "Allocations" },
  { id: "policy-assignments", label: "Policy Assignments" },
  { id: "encashments", label: "Encashments" },
  { id: "comp-requests", label: "Comp-off Requests" },
  { id: "control-panel", label: "Control Panel" },
  { id: "ledger", label: "Ledger" },
];

function tabFrom(v: string | undefined): Tab {
  return (TABS.find((t) => t.id === (v as Tab))?.id ?? "allocations") as Tab;
}

export default async function LeaveAdminPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const access = await getMyAccess();
  if (!(access.isHrAdmin || access.isItAdmin || access.isHrAny)) {
    redirect(
      "/forbidden?need=HR_ANY&from=" +
        encodeURIComponent("/hr/leaves/admin"),
    );
  }
  const tab = tabFrom(searchParams.tab);

  const [
    allocations,
    policyAssignments,
    encashments,
    compRequests,
    ledger,
    leaveTypes,
    leavePolicies,
    leavePeriods,
    companies,
    employees,
    departments,
    branches,
  ] = await Promise.all([
    listLeaveAllocations(),
    listLeavePolicyAssignments(),
    listLeaveEncashments(),
    listCompensatoryLeaveRequests(),
    listLeaveLedgerEntries(),
    listLeaveTypes(),
    listLeavePolicies(),
    listLeavePeriods(),
    listCompanies(),
    listAttendableEmployees({}),
    listDepartments(),
    listBranches(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/leaves" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to leave applications
      </Link>

      <PageHeader
        icon={Plane}
        crumb="HR · Leaves · Admin"
        title="Leave admin"
        subtitle="Allocations, policy assignments, encashments, comp-off requests, bulk allocation, and the immutable Leave Ledger — all in one workspace."
      />

      <SubTabs
        tabs={TABS}
        active={tab}
        hrefFor={(id) =>
          id === "allocations"
            ? "/hr/leaves/admin"
            : `/hr/leaves/admin?tab=${id}`
        }
      />

      {access.isHrAdmin || access.isItAdmin ? (
        <LeaveAdminHub
          tab={tab}
          allocations={allocations}
          policyAssignments={policyAssignments}
          encashments={encashments}
          compRequests={compRequests}
          ledger={ledger}
          leaveTypes={leaveTypes.map((t) => t.name)}
          compensatoryLeaveTypes={leaveTypes
            .filter((t) => t.isCompensatory)
            .map((t) => t.name)}
          encashableLeaveTypes={leaveTypes
            .filter((t) => t.allowEncashment)
            .map((t) => t.name)}
          leavePolicies={leavePolicies.map((p) => ({
            name: p.name,
            title: p.title || p.name,
          }))}
          leavePeriods={leavePeriods.map((p) => ({
            name: p.name,
            fromDate: p.fromDate,
            toDate: p.toDate,
          }))}
          companies={companies}
          employees={employees}
          departments={departments}
          branches={branches}
        />
      ) : (
        <EmptyState>
          Read-only surface for now — full CRUD requires the HR Admin role.
        </EmptyState>
      )}
    </div>
  );
}

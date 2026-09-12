"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";
import type {
  CompLeaveRequestRow,
  LeaveAllocationRow,
  LeaveEncashmentRow,
  LeaveLedgerRow,
  LeavePolicyAssignmentRow,
} from "@/lib/frappe/leave-admin";
import type { AttendableEmployee } from "@/lib/frappe/attendance-bulk";
import {
  adjustLeaveAllocationAction,
  cancelLeaveDocAction,
  controlPanelAllocateAction,
  createCompensatoryLeaveAction,
  createLeaveAllocationAction,
  createLeaveEncashmentAction,
  createLeavePolicyAssignmentAction,
  submitLeaveDocAction,
} from "@/app/(workspace)/hr/leaves/admin/actions";

type Tab =
  | "allocations"
  | "policy-assignments"
  | "encashments"
  | "comp-requests"
  | "control-panel"
  | "ledger";

const EMPTY: StdFormState = {};

export function LeaveAdminHub(props: {
  tab: Tab;
  allocations: LeaveAllocationRow[];
  policyAssignments: LeavePolicyAssignmentRow[];
  encashments: LeaveEncashmentRow[];
  compRequests: CompLeaveRequestRow[];
  ledger: LeaveLedgerRow[];
  leaveTypes: string[];
  compensatoryLeaveTypes: string[];
  encashableLeaveTypes: string[];
  leavePolicies: Array<{ name: string; title: string }>;
  leavePeriods: Array<{ name: string; fromDate: string; toDate: string }>;
  companies: string[];
  employees: AttendableEmployee[];
  departments: string[];
  branches: string[];
}) {
  switch (props.tab) {
    case "allocations":
      return (
        <AllocationsTab
          rows={props.allocations}
          leaveTypes={props.leaveTypes}
          employees={props.employees}
        />
      );
    case "policy-assignments":
      return (
        <PolicyAssignmentsTab
          rows={props.policyAssignments}
          policies={props.leavePolicies}
          periods={props.leavePeriods}
          employees={props.employees}
        />
      );
    case "encashments":
      return (
        <EncashmentsTab
          rows={props.encashments}
          leaveTypes={props.encashableLeaveTypes}
          employees={props.employees}
        />
      );
    case "comp-requests":
      return (
        <CompRequestsTab
          rows={props.compRequests}
          leaveTypes={props.compensatoryLeaveTypes}
          employees={props.employees}
        />
      );
    case "control-panel":
      return (
        <ControlPanelTab
          leaveTypes={props.leaveTypes}
          employees={props.employees}
          departments={props.departments}
          branches={props.branches}
        />
      );
    case "ledger":
      return <LedgerTab rows={props.ledger} />;
  }
}

// ============================================================================
// Allocations
// ============================================================================

function AllocationsTab({
  rows,
  leaveTypes,
  employees,
}: {
  rows: LeaveAllocationRow[];
  leaveTypes: string[];
  employees: AttendableEmployee[];
}) {
  const [state, dispatch] = useFormState(createLeaveAllocationAction, EMPTY);
  const [adjustFor, setAdjustFor] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <Section title="New allocation">
        <form action={dispatch} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          {state.error && <ErrBanner msg={state.error} />}
          <EmpSelect employees={employees} className="sm:col-span-2" />
          <SelectField name="leave_type" label="Leave type" options={leaveTypes} required />
          <DateField name="from_date" label="From" required />
          <DateField name="to_date" label="To" required />
          <NumberField name="new_leaves_allocated" label="Days" step={0.5} required />
          <CheckField
            name="carry_forward"
            label="Carry forward unused from prior period"
            className="sm:col-span-6"
          />
          <div className="sm:col-span-6 flex justify-end">
            <Submit label="Create + submit" icon={<Send className="h-3.5 w-3.5" />} />
          </div>
        </form>
      </Section>

      <Section title={`Allocations (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="p-4 text-center text-sm text-ash-500">
            No allocations yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-canvas/50 text-left text-xs text-ash-500">
              <tr>
                <Th>Employee</Th>
                <Th>Leave type</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th className="text-right">New</Th>
                <Th className="text-right">Carry</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th className="w-40">{" "}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <>
                  <tr key={r.name}>
                    <Td>{r.employeeName ?? r.employee}</Td>
                    <Td>{r.leaveType}</Td>
                    <Td>{r.fromDate}</Td>
                    <Td>{r.toDate}</Td>
                    <Td className="text-right">{r.newLeavesAllocated}</Td>
                    <Td className="text-right">{r.unusedLeaves}</Td>
                    <Td className="text-right font-medium">{r.totalLeavesAllocated}</Td>
                    <Td>
                      <StatusPill docstatus={r.docstatus} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        {r.docstatus === 0 && (
                          <SubmitInline doctype="Leave Allocation" name={r.name} />
                        )}
                        {r.docstatus === 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setAdjustFor(adjustFor === r.name ? null : r.name)
                              }
                              className="rounded-chip border border-hairline px-2 py-1 text-[10px] font-medium text-ash-700 hover:border-ink-400 hover:text-ink-800"
                            >
                              Adjust
                            </button>
                            <CancelInline doctype="Leave Allocation" name={r.name} />
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                  {adjustFor === r.name && (
                    <tr key={`${r.name}-adjust`}>
                      <td colSpan={9} className="bg-canvas/30 p-3">
                        <AdjustForm name={r.name} onClose={() => setAdjustFor(null)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function AdjustForm({ name, onClose }: { name: string; onClose: () => void }) {
  const [state, dispatch] = useFormState(adjustLeaveAllocationAction, EMPTY);
  return (
    <form action={dispatch} className="flex flex-wrap items-end gap-2 text-xs">
      <input type="hidden" name="name" value={name} />
      {state.error && <ErrBanner msg={state.error} className="w-full" />}
      <label className="flex flex-col gap-1">
        <span className="text-ash-600">Direction</span>
        <select
          name="direction"
          defaultValue="add"
          className="h-8 rounded-md border border-hairline bg-white px-2"
        >
          <option value="add">Add (+)</option>
          <option value="deduct">Deduct (−)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ash-600">Days</span>
        <input
          type="number"
          name="days"
          min={0}
          step={0.5}
          required
          className="h-8 w-24 rounded-md border border-hairline bg-white px-2"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-ash-600">Reason</span>
        <input
          name="reason"
          placeholder="Manual correction, court order, backfill…"
          className="h-8 rounded-md border border-hairline bg-white px-2"
        />
      </label>
      <Submit label="Adjust" small />
      <button
        type="button"
        onClick={onClose}
        className="h-8 rounded-chip px-2 text-ash-500 hover:bg-canvas hover:text-ink-800"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

// ============================================================================
// Policy Assignments
// ============================================================================

function PolicyAssignmentsTab({
  rows,
  policies,
  periods,
  employees,
}: {
  rows: LeavePolicyAssignmentRow[];
  policies: Array<{ name: string; title: string }>;
  periods: Array<{ name: string; fromDate: string; toDate: string }>;
  employees: AttendableEmployee[];
}) {
  const [state, dispatch] = useFormState(
    createLeavePolicyAssignmentAction,
    EMPTY,
  );
  const [basedOn, setBasedOn] = useState<
    "Leave Period" | "Joining Date" | "Manual"
  >("Leave Period");
  return (
    <div className="flex flex-col gap-4">
      <Section title="Assign a policy">
        <form action={dispatch} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          {state.error && <ErrBanner msg={state.error} />}
          <EmpSelect employees={employees} className="sm:col-span-2" />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ash-600">
              Policy <span className="text-fall">*</span>
            </span>
            <select
              name="leave_policy"
              required
              defaultValue=""
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
            >
              <option value="" disabled>
                —
              </option>
              {policies.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ash-600">
              Based on <span className="text-fall">*</span>
            </span>
            <select
              name="assignment_based_on"
              value={basedOn}
              onChange={(e) =>
                setBasedOn(
                  e.target.value as "Leave Period" | "Joining Date" | "Manual",
                )
              }
              className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
            >
              <option value="Leave Period">Leave Period</option>
              <option value="Joining Date">Joining Date</option>
              <option value="Manual">Manual</option>
            </select>
          </label>
          {basedOn === "Leave Period" ? (
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-xs text-ash-600">
                Leave period <span className="text-fall">*</span>
              </span>
              <select
                name="leave_period"
                required
                defaultValue=""
                className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
              >
                <option value="" disabled>
                  {periods.length === 0
                    ? "No leave periods defined — set one under Configuration first"
                    : "Pick a leave period"}
                </option>
                {periods.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} · {p.fromDate} → {p.toDate}
                  </option>
                ))}
              </select>
            </label>
          ) : basedOn === "Manual" ? (
            <>
              <DateField name="effective_from" label="Effective from" required />
              <DateField name="effective_to" label="Effective to" required />
            </>
          ) : (
            <p className="text-xs text-ash-500 sm:col-span-2 self-end pb-2">
              Effective dates auto-derive from the employee&apos;s joining
              date. Nothing more to pick.
            </p>
          )}
          <CheckField name="carry_forward" label="Carry forward unused" className="sm:col-span-6" />
          <div className="sm:col-span-6 flex justify-end">
            <Submit label="Assign + generate allocations" icon={<Send className="h-3.5 w-3.5" />} />
          </div>
        </form>
      </Section>
      <Section title={`Assignments (${rows.length})`}>
        <SimpleTable
          headers={["Employee", "Policy", "Based on", "From", "To", "Allocated", "Status", ""]}
          rows={rows.map((r) => {
            const policyTitle =
              policies.find((p) => p.name === r.leavePolicy)?.title ??
              r.leavePolicy;
            return [
            r.employeeName ?? r.employee,
            policyTitle,
            r.assignmentBasedOn,
            r.effectiveFrom ?? "—",
            r.effectiveTo ?? "—",
            r.leavesAllocated ? "✓" : "—",
            <StatusPill key={`${r.name}-st`} docstatus={r.docstatus} />,
            r.docstatus === 0 ? (
              <SubmitInline
                key={`${r.name}-a`}
                doctype="Leave Policy Assignment"
                name={r.name}
              />
            ) : null,
            ];
          })}
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Encashments
// ============================================================================

function EncashmentsTab({
  rows,
  leaveTypes,
  employees,
}: {
  rows: LeaveEncashmentRow[];
  leaveTypes: string[];
  employees: AttendableEmployee[];
}) {
  const [state, dispatch] = useFormState(createLeaveEncashmentAction, EMPTY);
  return (
    <div className="flex flex-col gap-4">
      <Section title="Encash unused leave">
        {leaveTypes.length === 0 ? (
          <p className="p-4 text-sm text-ash-500">
            No encashable leave types yet — tick <strong>Allow encashment</strong> on
            the leave type first (Settings → Leave Types).
          </p>
        ) : (
          <form action={dispatch} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            {state.error && <ErrBanner msg={state.error} />}
            <EmpSelect employees={employees} className="sm:col-span-2" />
            <SelectField name="leave_type" label="Leave type" options={leaveTypes} required />
            <DateField name="encashment_date" label="Encashment date" required />
            <CheckField
              name="pay_via_salary_slip"
              label="Pay via Salary Slip (adds an Additional Salary entry)"
              defaultChecked
              className="sm:col-span-6"
            />
            <div className="sm:col-span-6 flex justify-end">
              <Submit label="Encash + submit" icon={<Send className="h-3.5 w-3.5" />} />
            </div>
          </form>
        )}
      </Section>
      <Section title={`Encashments (${rows.length})`}>
        <SimpleTable
          headers={["Employee", "Leave type", "Date", "Days", "Amount", "Status", ""]}
          rows={rows.map((r) => [
            r.employeeName ?? r.employee,
            r.leaveType,
            r.encashmentDate,
            r.encashmentDays,
            r.encashmentAmount.toLocaleString(),
            <StatusPill key={`${r.name}-st`} docstatus={r.docstatus} />,
            r.docstatus === 0 ? (
              <SubmitInline
                key={`${r.name}-a`}
                doctype="Leave Encashment"
                name={r.name}
              />
            ) : null,
          ])}
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Compensatory
// ============================================================================

function CompRequestsTab({
  rows,
  leaveTypes,
  employees,
}: {
  rows: CompLeaveRequestRow[];
  leaveTypes: string[];
  employees: AttendableEmployee[];
}) {
  const [state, dispatch] = useFormState(createCompensatoryLeaveAction, EMPTY);
  return (
    <div className="flex flex-col gap-4">
      <Section title="New comp-off request">
        {leaveTypes.length === 0 ? (
          <p className="p-4 text-sm text-ash-500">
            No compensatory leave types yet — tick{" "}
            <strong>Compensatory</strong> on the leave type first
            (Settings → Leave Types).
          </p>
        ) : (
          <form action={dispatch} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            {state.error && <ErrBanner msg={state.error} />}
            <EmpSelect employees={employees} className="sm:col-span-2" />
            <SelectField name="leave_type" label="Leave type" options={leaveTypes} required />
            <DateField name="work_from_date" label="Worked from" required />
            <DateField name="work_end_date" label="Worked to" required />
            <label className="sm:col-span-6 flex flex-col gap-1 text-sm">
              <span className="text-xs text-ash-600">Reason</span>
              <input
                name="reason"
                placeholder="Attended launch weekend / covered on-call…"
                className="h-10 rounded-md border border-hairline bg-white px-2 text-sm"
              />
            </label>
            <div className="sm:col-span-6 flex justify-end">
              <Submit label="Submit request" icon={<Send className="h-3.5 w-3.5" />} />
            </div>
          </form>
        )}
      </Section>
      <Section title={`Requests (${rows.length})`}>
        <SimpleTable
          headers={["Employee", "Leave type", "From", "To", "Reason", "Status", ""]}
          rows={rows.map((r) => [
            r.employeeName ?? r.employee,
            r.leaveType,
            r.workFromDate,
            r.workEndDate,
            r.reason ?? "—",
            <StatusPill key={`${r.name}-st`} docstatus={r.docstatus} />,
            r.docstatus === 0 ? (
              <SubmitInline
                key={`${r.name}-a`}
                doctype="Compensatory Leave Request"
                name={r.name}
              />
            ) : null,
          ])}
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Control Panel (bulk allocate)
// ============================================================================

function ControlPanelTab({
  leaveTypes,
  employees,
  departments,
  branches,
}: {
  leaveTypes: string[];
  employees: AttendableEmployee[];
  departments: string[];
  branches: string[];
}) {
  const [state, dispatch] = useFormState(controlPanelAllocateAction, EMPTY as StdFormState & { created?: number; failed?: number });
  const [dept, setDept] = useState("");
  const [branch, setBranch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const shown = employees.filter(
    (e) =>
      (!dept || e.department === dept) &&
      (!branch || e.branch === branch),
  );
  const toggleAll = () => {
    if (shown.every((e) => picked.has(e.id))) {
      const next = new Set(picked);
      for (const e of shown) next.delete(e.id);
      setPicked(next);
    } else {
      const next = new Set(picked);
      for (const e of shown) next.add(e.id);
      setPicked(next);
    }
  };
  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state.error && <ErrBanner msg={state.error} />}
      {("created" in state || "failed" in state) && (
        <p className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-rise" />
          Created {(state as { created?: number }).created ?? 0} allocation(s) · Failed {(state as { failed?: number }).failed ?? 0}
        </p>
      )}
      <Section title="What to allocate">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <SelectField name="leave_type" label="Leave type" options={leaveTypes} required />
          <DateField name="from_date" label="From" required />
          <DateField name="to_date" label="To" required />
          <NumberField name="new_leaves_allocated" label="Days each" step={0.5} required />
          <CheckField name="carry_forward" label="Carry forward" className="self-end pb-1" />
        </div>
      </Section>
      <Section title="Who">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-1 rounded-chip border border-hairline bg-surface px-2 py-1">
            Dept:
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="">Any</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-1 rounded-chip border border-hairline bg-surface px-2 py-1">
            Branch:
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="">Any</option>
              {branches.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-chip border border-hairline bg-surface px-2 py-1 text-ash-700"
          >
            {shown.every((e) => picked.has(e.id))
              ? `Clear all ${shown.length}`
              : `Select all ${shown.length}`}
          </button>
          <span className="text-ash-500">
            {picked.size} selected · {shown.length} shown · {employees.length} total
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-card border border-hairline">
          {shown.map((e) => {
            const checked = picked.has(e.id);
            return (
              <label
                key={e.id}
                className="flex items-center gap-2 border-b border-hairline px-3 py-2 text-sm last:border-b-0"
              >
                <input
                  type="checkbox"
                  name="employees"
                  value={e.id}
                  checked={checked}
                  onChange={() =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(e.id)) next.delete(e.id);
                      else next.add(e.id);
                      return next;
                    })
                  }
                  className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
                />
                <span className="flex-1">{e.employeeName}</span>
                <span className="text-xs text-ash-500">{e.department ?? "—"}</span>
              </label>
            );
          })}
          {shown.length === 0 && (
            <p className="p-4 text-center text-sm text-ash-500">
              No employees match the current filters.
            </p>
          )}
        </div>
      </Section>
      <div className="flex justify-end">
        <Submit
          label={`Allocate to ${picked.size} employee${picked.size === 1 ? "" : "s"}`}
          icon={<Send className="h-3.5 w-3.5" />}
        />
      </div>
    </form>
  );
}

// ============================================================================
// Ledger
// ============================================================================

function LedgerTab({ rows }: { rows: LeaveLedgerRow[] }) {
  return (
    <Section title={`Leave Ledger Entries (${rows.length})`}>
      {rows.length === 0 ? (
        <p className="p-4 text-center text-sm text-ash-500">
          No ledger entries yet. Every Allocation / Application / Encashment / Adjustment posts here.
        </p>
      ) : (
        <SimpleTable
          headers={["When", "Employee", "Leave type", "Transaction", "Reference", "Δ Days", "Flags"]}
          rows={rows.map((r) => [
            r.creation.slice(0, 16).replace("T", " "),
            r.employeeName ?? r.employee,
            r.leaveType,
            r.transactionType,
            r.transactionName,
            <span
              key={`${r.name}-d`}
              className={r.leaves >= 0 ? "text-rise" : "text-fall"}
            >
              {r.leaves > 0 ? "+" : ""}
              {r.leaves}
            </span>,
            <span key={`${r.name}-f`} className="inline-flex gap-1 text-[10px]">
              {r.isCarryForward && (
                <span className="rounded-chip bg-ink-50 px-1.5 py-0.5">carry</span>
              )}
              {r.isExpired && (
                <span className="rounded-chip bg-fall/10 px-1.5 py-0.5 text-fall">
                  expired
                </span>
              )}
            </span>,
          ])}
        />
      )}
    </Section>
  );
}

// ============================================================================
// Shared bits
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden p-0">
      <p className="border-b border-hairline bg-canvas/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ash-500">
        {title}
      </p>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ErrBanner({ msg, className }: { msg: string; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-3 py-2 text-sm text-fall sm:col-span-6",
        className,
      )}
    >
      <AlertCircle className="h-4 w-4" />
      {msg}
    </p>
  );
}

function EmpSelect({
  employees,
  className,
}: {
  employees: AttendableEmployee[];
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1 text-sm", className)}>
      <span className="text-xs text-ash-600">
        Employee <span className="text-fall">*</span>
      </span>
      <select
        name="employee"
        required
        defaultValue=""
        className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
      >
        <option value="" disabled>
          Select employee
        </option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.employeeName} · {e.id}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-ash-600">
        {label}
        {required && <span className="text-fall"> *</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
      >
        <option value="" disabled={required}>
          —
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-ash-600">
        {label}
        {required && <span className="text-fall"> *</span>}
      </span>
      <input
        type="date"
        name={name}
        required={required}
        className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
      />
    </label>
  );
}

function NumberField({
  name,
  label,
  step,
  required,
}: {
  name: string;
  label: string;
  step?: number;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-ash-600">
        {label}
        {required && <span className="text-fall"> *</span>}
      </span>
      <input
        type="number"
        name={name}
        step={step}
        min={0}
        required={required}
        className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
      />
    </label>
  );
}

function CheckField({
  name,
  label,
  defaultChecked,
  className,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-ash-800", className)}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
      />
      {label}
    </label>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ash-500", className)}>
      {children}
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 text-sm text-ash-800", className)}>{children}</td>;
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-ash-500">Nothing to show yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-hairline bg-canvas/50">
          <tr>
            {headers.map((h) => (
              <Th key={h}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <Td key={j}>{cell}</Td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ docstatus }: { docstatus: 0 | 1 | 2 }) {
  const label = docstatus === 0 ? "Draft" : docstatus === 1 ? "Submitted" : "Cancelled";
  const tone =
    docstatus === 0
      ? "bg-amber-100 text-amber-800"
      : docstatus === 1
        ? "bg-rise/10 text-rise"
        : "bg-ash-100 text-ash-600";
  return (
    <span className={cn("rounded-chip px-2 py-0.5 text-[10px] font-medium", tone)}>
      {label}
    </span>
  );
}

function SubmitInline({
  doctype,
  name,
}: {
  doctype:
    | "Leave Allocation"
    | "Leave Policy Assignment"
    | "Leave Encashment"
    | "Compensatory Leave Request"
    | "Leave Block List";
  name: string;
}) {
  const [, dispatch] = useFormState(submitLeaveDocAction, EMPTY);
  return (
    <form action={dispatch} className="inline">
      <input type="hidden" name="doctype" value={doctype} />
      <input type="hidden" name="name" value={name} />
      <SubmitTinyBtn label="Submit" />
    </form>
  );
}

function CancelInline({
  doctype,
  name,
}: {
  doctype:
    | "Leave Allocation"
    | "Leave Policy Assignment"
    | "Leave Encashment"
    | "Compensatory Leave Request"
    | "Leave Block List";
  name: string;
}) {
  const [, dispatch] = useFormState(cancelLeaveDocAction, EMPTY);
  return (
    <form action={dispatch} className="inline">
      <input type="hidden" name="doctype" value={doctype} />
      <input type="hidden" name="name" value={name} />
      <SubmitTinyBtn label="Cancel" tone="fall" />
    </form>
  );
}

function SubmitTinyBtn({ label, tone }: { label: string; tone?: "fall" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "rounded-chip border border-hairline px-2 py-1 text-[10px] font-medium transition hover:border-ink-400",
        tone === "fall"
          ? "text-fall hover:bg-fall/10"
          : "text-ash-700 hover:text-ink-800",
      )}
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
    </button>
  );
}

function Submit({
  label,
  icon,
  small,
}: {
  label: string;
  icon?: React.ReactNode;
  small?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip bg-ink-800 text-white transition focus-ring hover:bg-ink-700 disabled:opacity-60",
        small ? "h-8 px-3 text-xs font-semibold" : "h-10 px-4 text-sm font-semibold",
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {pending ? "Working…" : label}
    </button>
  );
}

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, X } from "lucide-react";

const OPERATIONS = ["", "Login", "Logout", "Created", "Updated", "Deleted", "Submitted", "Cancelled", "Exported"];
const DOCTYPES = [
  "",
  // Accounting
  "Journal Entry", "Payment Entry", "Sales Invoice", "Purchase Invoice",
  "Period Closing Voucher", "Share Transfer", "Exchange Rate Revaluation",
  // Payroll
  "Payroll Run", "Payroll Wizard Entry", "Payroll Transaction",
  "Payroll Run Payslip", "Company Payroll Settings", "Salary Slip",
  // HR
  "Employee", "Leave Application", "Attendance", "Shift Assignment",
  "Timesheet", "Expense Claim", "Appraisal",
  // Admin
  "User", "Department", "Job Title", "Payroll NEC Industry", "Payroll Pay Grade",
];

/**
 * Six-field filter bar for the Audit log feed — rewrites URL params
 * on change, Server Component re-fetches with the new filters. Clear
 * button wipes everything back to defaults.
 */
export function AuditFilters({
  current,
}: {
  current: {
    user: string;
    operation: string;
    doctype: string;
    docname: string;
    from: string;
    to: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function push(patch: Partial<typeof current>) {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    start(() => router.push(`${pathname}?${q.toString()}`));
  }

  function clearAll() {
    const q = new URLSearchParams(params);
    for (const k of ["user", "operation", "doctype", "docname", "from", "to"]) q.delete(k);
    start(() => router.push(`${pathname}${q.toString() ? `?${q.toString()}` : ""}`));
  }

  const anyActive = Boolean(current.user || current.operation || current.doctype || current.docname || current.from || current.to);

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="User">
          <input
            type="text"
            placeholder="email or Administrator"
            defaultValue={current.user}
            onBlur={(e) => push({ user: e.currentTarget.value.trim() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-xs"
          />
        </Field>
        <Field label="Action">
          <select
            value={current.operation}
            onChange={(e) => push({ operation: e.currentTarget.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
          >
            {OPERATIONS.map((o) => (
              <option key={o} value={o}>{o || "Any"}</option>
            ))}
          </select>
        </Field>
        <Field label="Document type">
          <select
            value={current.doctype}
            onChange={(e) => push({ doctype: e.currentTarget.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
          >
            {DOCTYPES.map((d) => (
              <option key={d} value={d}>{d || "Any"}</option>
            ))}
          </select>
        </Field>
        <Field label="Document ID">
          <input
            type="text"
            placeholder="e.g. HR-EMP-00486"
            defaultValue={current.docname}
            onBlur={(e) => push({ docname: e.currentTarget.value.trim() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-xs"
          />
        </Field>
        <Field label="From">
          <input
            type="date"
            value={current.from}
            onChange={(e) => push({ from: e.currentTarget.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            value={current.to}
            onChange={(e) => push({ to: e.currentTarget.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
          />
        </Field>
      </div>
      {(pending || anyActive) && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {pending ? (
            <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Updating…</span>
          ) : <span />}
          {anyActive && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted/40"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

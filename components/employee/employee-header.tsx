import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Mail, Phone, Building2, Pencil, FileText } from "lucide-react";
import type { EmployeeFull } from "@/lib/frappe/employees";
import { EmployeeAvatar } from "./avatar";
import { StatusBadge } from "./status-badge";

/**
 * The persistent banner card at the top of an employee's profile. Matches the
 * mockup's stacked layout: back-link → identity row → contact chips.
 *
 * `canIssueLetters` controls the HR-only "Letters" CTA in the top-right —
 * driven by the workspace's role-bundle check, not local state.
 */
export function EmployeeHeader({
  emp,
  canIssueLetters = false,
  canEdit = false,
}: {
  emp: EmployeeFull;
  canIssueLetters?: boolean;
  canEdit?: boolean;
}) {
  const editHref = `/employee/${encodeURIComponent(emp.id)}/edit` as Route;
  const lettersHref = `/employee/${encodeURIComponent(emp.id)}/letters` as Route;

  return (
    <section className="card flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={"/employee" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to directory
        </Link>
        <div className="flex items-center gap-2">
          {canIssueLetters && (
            <Link
              href={lettersHref}
              className="inline-flex items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
            >
              <FileText className="h-3.5 w-3.5" />
              Letters
            </Link>
          )}
          {canEdit && (
            <Link
              href={editHref}
              className="inline-flex items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <EmployeeAvatar
            name={emp.name}
            imageUrl={emp.imageUrl}
            size="lg"
          />
          <div className="min-w-0 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                {emp.name}
              </h1>
              <StatusBadge status={emp.status} />
            </div>
            <p className="text-sm text-ash-600">
              {emp.designation ?? "—"}
              {emp.department ? ` · ${emp.department}` : ""}
            </p>
            <p className="text-xs text-ash-500">Employee ID · {emp.id}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-xs sm:min-w-[260px]">
          {emp.email && (
            <ContactRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={emp.email} />
          )}
          {emp.mobile && (
            <ContactRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={emp.mobile} />
          )}
          {emp.company && (
            <ContactRow
              icon={<Building2 className="h-3.5 w-3.5" />}
              label="Company"
              value={emp.company}
            />
          )}
        </dl>
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-canvas text-ash-600">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-medium uppercase tracking-wide text-ash-500">
          {label}
        </dt>
        <dd className="truncate text-sm text-ash-900">{value}</dd>
      </div>
    </div>
  );
}

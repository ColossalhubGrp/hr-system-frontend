import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FileText, Lock, ArrowRight } from "lucide-react";
import { getEmployee } from "@/lib/frappe/employees";
import { getMyAccess } from "@/lib/frappe/roles";
import { LETTER_TYPES } from "@/lib/frappe/letters";

export const metadata = { title: "HR Letters · Colossal HR" };

export default async function EmployeeLettersIndex({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const access = await getMyAccess();
  // Letter generation is HR-issued. We don't expose it to the employee
  // themselves — they'd request a letter via /me (not yet wired) and HR
  // would issue from here.
  if (!access.isHrAny) {
    redirect(
      `/forbidden?need=HR_ANY&from=${encodeURIComponent(`/employee/${id}/letters`)}`,
    );
  }
  const emp = await getEmployee(id);
  if (!emp) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/employee/${encodeURIComponent(emp.id)}` as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {emp.name}
      </Link>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <FileText className="h-3.5 w-3.5" />
          HR · Letters
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Generate a letter for {emp.name}
        </h1>
        <p className="text-sm text-ash-600">
          Pre-filled with this employee's record. Preview to review, then use
          your browser's Print → Save as PDF to issue.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LETTER_TYPES.map((t) => {
          const available = t.availableWhen(emp);
          const previewHref =
            `/employee/${encodeURIComponent(emp.id)}/letters/${t.kind}` as Route;
          return (
            <li key={t.kind}>
              <div
                className={`flex h-full flex-col rounded-card border bg-surface p-5 shadow-card ${
                  available
                    ? "border-hairline hover:border-ink-300"
                    : "border-hairline opacity-70"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-ink-700" />
                  <h3 className="font-semibold text-ink-800">{t.label}</h3>
                </div>
                <p className="mb-4 flex-1 text-sm text-ash-600">
                  {t.description}
                </p>
                {available ? (
                  <Link
                    href={previewHref}
                    className="inline-flex h-9 w-fit items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring"
                  >
                    Preview
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="inline-flex items-center gap-1.5 rounded-chip border border-hairline px-2 py-1 text-[11px] font-medium text-ash-500">
                    <Lock className="h-3 w-3" />
                    {t.unavailableReason ?? "Not available for this employee."}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

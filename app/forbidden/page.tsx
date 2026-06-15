import Link from "next/link";
import type { Route } from "next";
import { ShieldAlert } from "lucide-react";
import { getMyRoles, ROLE_GROUPS } from "@/lib/frappe/roles";

export const metadata = { title: "Forbidden · Colossal HR" };

const GROUP_HUMAN: Record<string, string> = {
  HR_ADMIN: "HR Manager or System Manager",
  HR_ANY: "an HR role (HR Manager, HR User, or HR Officer)",
  PAYROLL_ADMIN: "HR Manager or Accounts Manager",
  SHIFT_ADMIN: "HR Manager, HR User, or System Manager",
  EMPLOYEE_ANY: "any signed-in employee",
};

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: { from?: string; need?: string };
}) {
  const roles = await getMyRoles();
  const mine = Array.from(roles).sort();
  const need = searchParams.need;
  const needed = need ? GROUP_HUMAN[need] ?? need : null;
  const requiredList: string[] | null = need
    ? Array.from(
        ROLE_GROUPS[need as keyof typeof ROLE_GROUPS] ?? [],
      ) as string[]
    : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-12">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-fall" />
        <h1 className="text-xl font-semibold text-ink-900">
          You don't have permission for this page
        </h1>
        <p className="text-sm text-ash-700">
          {needed
            ? `This area requires the ${needed} role.`
            : "Your current role doesn't include access here."}{" "}
          Ask your HR administrator if you need it.
        </p>

        <div className="mt-2 flex w-full flex-col gap-2 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
            Your roles
          </p>
          {mine.length === 0 ? (
            <p className="text-xs text-ash-500">No roles assigned.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {mine.map((r) => (
                <li
                  key={r}
                  className="rounded-chip border border-hairline bg-canvas px-2.5 py-0.5 text-xs font-medium text-ash-800"
                >
                  {r}
                </li>
              ))}
            </ul>
          )}

          {requiredList && requiredList.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ash-500">
                Required (any of)
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {requiredList.map((r) => (
                  <li
                    key={r}
                    className="rounded-chip border border-amber-200 bg-amber-50/70 px-2.5 py-0.5 text-xs font-medium text-amber-900"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={"/me" as Route}
            className="inline-flex h-9 items-center rounded-chip bg-ink-800 px-4 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            Go to my dashboard
          </Link>
          {searchParams.from && (
            <Link
              href={"/" as Route}
              className="inline-flex h-9 items-center rounded-chip border border-hairline bg-surface px-4 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
            >
              Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

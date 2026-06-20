import Link from "next/link";
import type { Route } from "next";
import { ShieldCheck, ChevronLeft } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { ROLE } from "@/lib/frappe/roles";
import { requireGroup } from "@/lib/frappe/require-role";

export const metadata = { title: "Permissions · Colossal HR" };

type DocPermRow = {
  parent: string;
  role: string;
  permlevel: number;
  read: 0 | 1;
  write: 0 | 1;
  create: 0 | 1;
  delete: 0 | 1;
  submit: 0 | 1;
  cancel: 0 | 1;
  if_owner: 0 | 1;
};

const SRS_ROLES = [
  ROLE.HR_DIRECTOR,
  ROLE.HR_OPERATIONS,
  ROLE.LINE_MANAGER,
  ROLE.PAYROLL_OFFICER,
  ROLE.FINANCE_REVIEWER,
  ROLE.EXECUTIVE_VIEWER,
  ROLE.DATA_STEWARD,
  ROLE.IT_ADMIN,
  ROLE.AUDITOR,
  ROLE.ALUMNI,
  ROLE.RECRUITER,
  ROLE.HIRING_MANAGER,
];

export default async function PermissionsPage() {
  // Same rationale as /settings/users — DocPerm matrix is IT-admin territory.
  await requireGroup("IT_ADMIN", "/settings/permissions");
  const rows = await frappeCall<DocPermRow[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Custom DocPerm",
      fields: [
        "parent",
        "role",
        "permlevel",
        "read",
        "write",
        "create",
        "delete",
        "submit",
        "cancel",
        "if_owner",
      ],
      filters: JSON.stringify([["role", "in", SRS_ROLES]]),
      order_by: "role asc, parent asc",
      limit_page_length: 2000,
    },
    as: "user",
  }).catch(() => [] as DocPermRow[]);

  // Group by role.
  const byRole = new Map<string, DocPermRow[]>();
  for (const r of SRS_ROLES) byRole.set(r, []);
  for (const row of rows) {
    const arr = byRole.get(row.role);
    if (arr) arr.push(row);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={"/settings" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to settings
        </Link>
        <header className="mt-3 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Settings · Permissions
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            DocPerm matrix
          </h1>
          <p className="text-sm text-ash-600">
            {rows.length} per-doctype grants across {SRS_ROLES.length} SRS
            roles. Edit individual rows in the admin console via{" "}
            <code>/app/role-permission-manager</code>.
          </p>
        </header>
      </div>

      <div className="flex flex-col gap-5">
        {SRS_ROLES.map((role) => {
          const perms = byRole.get(role) ?? [];
          return (
            <details
              key={role}
              className="rounded-card border border-hairline bg-surface shadow-card"
              open={false}
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-ink-800">
                <span>{role}</span>
                <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium">
                  {perms.length} grant{perms.length === 1 ? "" : "s"}
                </span>
              </summary>
              {perms.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">
                        DocType
                      </th>
                      <th className="px-2 py-2 text-center font-medium">Read</th>
                      <th className="px-2 py-2 text-center font-medium">
                        Write
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Create
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Delete
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Submit
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Cancel
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        If owner
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {perms.map((p, i) => (
                      <tr key={`${p.parent}-${p.permlevel}-${i}`}>
                        <td className="px-4 py-2 font-medium text-ink-800">
                          {p.parent}
                        </td>
                        <Cell on={p.read} />
                        <Cell on={p.write} />
                        <Cell on={p.create} />
                        <Cell on={p.delete} />
                        <Cell on={p.submit} />
                        <Cell on={p.cancel} />
                        <Cell on={p.if_owner} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-4 text-xs italic text-ash-500">
                  No DocPerm grants for this role.
                </p>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ on }: { on: 0 | 1 }) {
  return (
    <td className="px-2 py-2 text-center">
      {on ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rise/15 text-rise">
          ✓
        </span>
      ) : (
        <span className="text-xs text-ash-400">·</span>
      )}
    </td>
  );
}

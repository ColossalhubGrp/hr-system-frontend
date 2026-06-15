import { Award, FileText, Calendar } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";
import { listMyPayslips } from "@/lib/frappe/my-self-service";

export const metadata = { title: "Alumni · Colossal HR" };

type EmployeeDoc = {
  name: string;
  employee_name: string | null;
  department: string | null;
  designation: string | null;
  branch: string | null;
  date_of_joining: string | null;
  relieving_date: string | null;
  status: string | null;
};

export default async function AlumniHome() {
  const session = readSession();
  // Find own (now-archived) Employee record. Alumni-only sessions have
  // read-only DocPerm on Employee with if_owner=1, so this returns just
  // their own record.
  const empRows = session.userId
    ? await frappeCall<Array<{ name: string }>>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Employee",
          filters: JSON.stringify([["user_id", "=", session.userId]]),
          fields: ["name"],
          limit_page_length: 1,
        },
        as: "user",
      }).catch(() => [])
    : [];

  const emp = empRows[0]
    ? await frappeCall<EmployeeDoc>({
        method: "frappe.client.get",
        args: { doctype: "Employee", name: empRows[0].name },
        as: "user",
      }).catch(() => null)
    : null;

  const payslips = await listMyPayslips().catch(() => []);

  const tenure = computeTenure(emp?.date_of_joining, emp?.relieving_date);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-hairline bg-surface p-6 shadow-card">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Award className="h-3.5 w-3.5" />
          Alumni portal
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          Welcome back, {emp?.employee_name ?? session.fullName ?? "alumnus"}.
        </h1>
        <p className="mt-2 text-sm text-ash-600">
          You're seeing a read-only window into your historical records — your
          last role, joining/relieving dates, and your final salary slips. No
          one else's data is visible here.
        </p>
      </section>

      {emp ? (
        <section className="rounded-card border border-hairline bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ash-500">
            Your record
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Item label="Employee ID" value={emp.name} />
            <Item label="Last designation" value={emp.designation} />
            <Item label="Last department" value={emp.department} />
            <Item label="Branch" value={emp.branch} />
            <Item
              label="Date of joining"
              value={fmtDate(emp.date_of_joining)}
              icon={<Calendar className="h-3.5 w-3.5 text-ash-500" />}
            />
            <Item
              label="Date of relieving"
              value={fmtDate(emp.relieving_date)}
              icon={<Calendar className="h-3.5 w-3.5 text-ash-500" />}
            />
            <Item label="Tenure" value={tenure} />
            <Item label="Status" value={emp.status} />
          </dl>
        </section>
      ) : (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-600">
          We couldn't find an employee record linked to your account. Reach out
          to HR — your alumni access may not have been fully provisioned.
        </p>
      )}

      <section className="rounded-card border border-hairline bg-surface p-6 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-ash-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Final salary slips
          </h2>
        </div>
        {payslips.length === 0 ? (
          <p className="text-sm text-ash-600">
            No salary slips on file under your account. If you need historical
            payslips for taxes, HR can issue them on request.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {payslips.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <div className="font-medium text-ink-800">{s.id}</div>
                  <div className="text-xs text-ash-500">
                    {fmtDate(s.startDate)} — {fmtDate(s.endDate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ash-500">{s.status}</div>
                  {s.netPay !== null && (
                    <div className="font-semibold text-ink-800">
                      {s.netPay.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-ash-500">
        Need something else? Email{" "}
        <a href="mailto:hr@colossalhub.com" className="underline">
          hr@colossalhub.com
        </a>{" "}
        — HR can help with historical letters, references, or document copies.
      </p>
    </div>
  );
}

function Item({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ash-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink-800">{value || "—"}</dd>
    </div>
  );
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function computeTenure(
  doj: string | null | undefined,
  dor: string | null | undefined,
): string | null {
  if (!doj) return null;
  const start = new Date(doj);
  const end = dor ? new Date(dor) : new Date(2026, 5, 13); // ref date matches /currentDate
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} months`;
  return `${years} year${years === 1 ? "" : "s"}${remMonths ? ` ${remMonths} month${remMonths === 1 ? "" : "s"}` : ""}`;
}

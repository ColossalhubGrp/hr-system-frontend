import { ShieldCheck } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";

export const metadata = { title: "Audit log · Colossal HR" };

type ActivityRow = {
  name: string;
  subject: string | null;
  user: string | null;
  operation: string | null;
  status: string | null;
  reference_doctype: string | null;
  reference_name: string | null;
  creation: string;
};

type VersionRow = {
  name: string;
  owner: string | null;
  ref_doctype: string | null;
  docname: string | null;
  data: string | null;
  creation: string;
};

type SP = { type?: string };

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const tab = searchParams.type === "versions" ? "versions" : "activity";

  const [activityRaw, versionsRaw] = await Promise.all([
    tab === "activity"
      ? frappeCall<ActivityRow[]>({
          method: "frappe.client.get_list",
          args: {
            doctype: "Activity Log",
            fields: [
              "name",
              "subject",
              "user",
              "operation",
              "status",
              "reference_doctype",
              "reference_name",
              "creation",
            ],
            order_by: "creation desc",
            limit_page_length: 100,
          },
          as: "user",
        }).catch(() => [] as ActivityRow[])
      : Promise.resolve([] as ActivityRow[]),
    tab === "versions"
      ? frappeCall<VersionRow[]>({
          method: "frappe.client.get_list",
          args: {
            doctype: "Version",
            fields: ["name", "owner", "ref_doctype", "docname", "creation"],
            order_by: "creation desc",
            limit_page_length: 100,
          },
          as: "user",
        }).catch(() => [] as VersionRow[])
      : Promise.resolve([] as VersionRow[]),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          HR · Audit log
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Audit log
        </h1>
        <p className="text-sm text-ash-600">
          Read-only window into what the system has recorded. Switch between
          login/action activity and per-document change versions.
        </p>
      </header>

      <div className="flex gap-2 text-xs">
        <a
          href="?type=activity"
          className={`rounded-chip border px-3 py-1.5 font-medium ${
            tab === "activity"
              ? "border-ink-800 bg-ink-800 text-white"
              : "border-hairline text-ash-700 hover:bg-canvas"
          }`}
        >
          Activity
        </a>
        <a
          href="?type=versions"
          className={`rounded-chip border px-3 py-1.5 font-medium ${
            tab === "versions"
              ? "border-ink-800 bg-ink-800 text-white"
              : "border-hairline text-ash-700 hover:bg-canvas"
          }`}
        >
          Document versions
        </a>
      </div>

      {tab === "activity" ? (
        <ActivityTable rows={activityRaw} />
      ) : (
        <VersionTable rows={versionsRaw} />
      )}
    </div>
  );
}

function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0)
    return <Empty msg="No activity events recorded yet." />;
  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">When</th>
            <th className="px-4 py-2.5 text-left font-medium">User</th>
            <th className="px-4 py-2.5 text-left font-medium">Operation</th>
            <th className="px-4 py-2.5 text-left font-medium">Document</th>
            <th className="px-4 py-2.5 text-left font-medium">Subject</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-4 py-3 text-xs text-ash-700">
                {fmtWhen(r.creation)}
              </td>
              <td className="px-4 py-3 text-ash-700">{r.user ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
                  {r.operation ?? "—"}
                </span>
              </td>
              <td className="px-4 py-3 text-ash-700">
                {r.reference_doctype ? (
                  <>
                    <div className="text-xs uppercase tracking-wide text-ash-500">
                      {r.reference_doctype}
                    </div>
                    <div>{r.reference_name ?? "—"}</div>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-ash-700">{r.subject ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionTable({ rows }: { rows: VersionRow[] }) {
  if (rows.length === 0)
    return <Empty msg="No document version records." />;
  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">When</th>
            <th className="px-4 py-2.5 text-left font-medium">By</th>
            <th className="px-4 py-2.5 text-left font-medium">Doctype</th>
            <th className="px-4 py-2.5 text-left font-medium">Document</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-4 py-3 text-xs text-ash-700">
                {fmtWhen(r.creation)}
              </td>
              <td className="px-4 py-3 text-ash-700">{r.owner ?? "—"}</td>
              <td className="px-4 py-3 text-ash-700">{r.ref_doctype ?? "—"}</td>
              <td className="px-4 py-3 text-ash-700">{r.docname ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-600">
      {msg}
    </p>
  );
}

function fmtWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

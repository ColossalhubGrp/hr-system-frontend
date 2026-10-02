import { ShieldCheck } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { AuditFilters } from "./filters";

export const metadata = { title: "Audit log · Colossal HR" };
export const dynamic = "force-dynamic";

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

type SP = {
  type?: string;
  user?: string;
  operation?: string;
  doctype?: string;
  docname?: string;
  from?: string;
  to?: string;
};

type Change = { field: string; from: unknown; to: unknown };
type FeedEvent = {
  key: string;
  when: string;
  user: string;
  operation: string;
  doctype: string | null;
  docname: string | null;
  subject: string;
  source: "activity" | "version";
  changes: Change[];
};

/** Fields on Version rows that are too noisy to show (and would
 *  waste the user's attention). Scrubbed in both views. */
const NOISY_FIELDS = new Set([
  "modified", "modified_by", "_user_tags", "_comments",
  "_assign", "_liked_by", "tsbuildinfo",
]);

function parseVersionData(raw: string | null): {
  changes: Change[];
  added: unknown[];
  removed: unknown[];
} {
  if (!raw) return { changes: [], added: [], removed: [] };
  try {
    const parsed = JSON.parse(raw) as {
      changed?: Array<[string, unknown, unknown]>;
      added?: unknown[];
      removed?: unknown[];
    };
    const changes: Change[] = (parsed.changed ?? [])
      .filter((c) => c && !NOISY_FIELDS.has(c[0]))
      .map((c) => ({ field: c[0], from: c[1], to: c[2] }));
    return {
      changes,
      added: parsed.added ?? [],
      removed: parsed.removed ?? [],
    };
  } catch {
    return { changes: [], added: [], removed: [] };
  }
}

function abbrev(v: unknown, max = 36): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Build a Frappe filters array from the search params. */
function activityFilters(sp: SP): string {
  const f: Array<[string, string, string | string[]]> = [];
  if (sp.user)      f.push(["user", "like", `%${sp.user}%`]);
  if (sp.operation) f.push(["operation", "=", sp.operation]);
  if (sp.doctype)   f.push(["reference_doctype", "=", sp.doctype]);
  if (sp.docname)   f.push(["reference_name", "like", `%${sp.docname}%`]);
  if (sp.from)      f.push(["creation", ">=", `${sp.from} 00:00:00`]);
  if (sp.to)        f.push(["creation", "<=", `${sp.to} 23:59:59`]);
  return JSON.stringify(f);
}

function versionFilters(sp: SP): string {
  const f: Array<[string, string, string | string[]]> = [];
  if (sp.user)    f.push(["owner", "like", `%${sp.user}%`]);
  if (sp.doctype) f.push(["ref_doctype", "=", sp.doctype]);
  if (sp.docname) f.push(["docname", "like", `%${sp.docname}%`]);
  if (sp.from)    f.push(["creation", ">=", `${sp.from} 00:00:00`]);
  if (sp.to)      f.push(["creation", "<=", `${sp.to} 23:59:59`]);
  return JSON.stringify(f);
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const current = {
    user: searchParams.user ?? "",
    operation: searchParams.operation ?? "",
    doctype: searchParams.doctype ?? "",
    docname: searchParams.docname ?? "",
    from: searchParams.from ?? "",
    to: searchParams.to ?? "",
  };

  // ──────────────────────────────────────────────────────────────────
  // Pull both sources in parallel. We ALWAYS pull both so the user sees
  // the unified feed (login + document edits in one stream). Filters
  // narrow the server-side result sets on both sides.
  // ──────────────────────────────────────────────────────────────────
  const [activityRaw, versionsRaw] = await Promise.all([
    frappeCall<ActivityRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Activity Log",
        fields: [
          "name", "subject", "user", "operation", "status",
          "reference_doctype", "reference_name", "creation",
        ],
        filters: activityFilters(current),
        order_by: "creation desc",
        limit_page_length: 200,
      },
      as: "user",
    }).catch(() => [] as ActivityRow[]),
    // Version rows only exist when a document was changed via the
    // standard save path (not db.set_value). Skip entirely if the user
    // narrowed to a specific login/logout operation.
    current.operation && !["Created", "Updated", "Deleted"].includes(current.operation)
      ? Promise.resolve([] as VersionRow[])
      : frappeCall<VersionRow[]>({
          method: "frappe.client.get_list",
          args: {
            doctype: "Version",
            fields: ["name", "owner", "ref_doctype", "docname", "data", "creation"],
            filters: versionFilters(current),
            order_by: "creation desc",
            limit_page_length: 200,
          },
          as: "user",
        }).catch(() => [] as VersionRow[]),
  ]);

  // Normalise both sources into a single event shape, sorted desc.
  const feed: FeedEvent[] = [];

  for (const a of activityRaw) {
    feed.push({
      key: `a:${a.name}`,
      when: a.creation,
      user: a.user ?? "—",
      operation: a.operation ?? "Activity",
      doctype: a.reference_doctype,
      docname: a.reference_name,
      subject: (a.subject ?? "").replace(/<[^>]+>/g, ""),
      source: "activity",
      changes: [],
    });
  }

  for (const v of versionsRaw) {
    const { changes, added, removed } = parseVersionData(v.data);
    if (changes.length === 0 && added.length === 0 && removed.length === 0) continue;
    const op = added.length > 0 ? "Created"
             : removed.length > 0 ? "Deleted"
             : "Updated";
    const subject =
      op === "Updated" && changes.length > 0
        ? `Edited ${changes.length} field${changes.length === 1 ? "" : "s"}`
        : op === "Created"
          ? "Record added"
          : "Record removed";
    feed.push({
      key: `v:${v.name}`,
      when: v.creation,
      user: v.owner ?? "—",
      operation: op,
      doctype: v.ref_doctype,
      docname: v.docname,
      subject,
      source: "version",
      changes,
    });
  }

  // Client-side operation filter — Version source doesn't support an
  // "operation" column, so apply the operation filter AFTER merging.
  const filtered = current.operation
    ? feed.filter((f) => f.operation === current.operation)
    : feed;

  filtered.sort((a, b) => b.when.localeCompare(a.when));
  const trimmed = filtered.slice(0, 300);

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
          Unified feed of every captured event — logins, record changes
          and administrative actions — with filters by user, action,
          document type and date range.
        </p>
      </header>

      <AuditFilters current={current} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {trimmed.length} of {filtered.length} event
          {filtered.length === 1 ? "" : "s"} shown
          {filtered.length > trimmed.length && ` (newest ${trimmed.length})`}
        </span>
        <span>
          Activity {activityRaw.length} · Document versions {versionsRaw.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {trimmed.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No events match the current filters.
                </td>
              </tr>
            ) : (
              trimmed.map((e) => (
                <tr key={e.key} className="border-b transition-colors hover:bg-muted/30 align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {fmtWhen(e.when)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{e.user}</td>
                  <td className="px-4 py-2">
                    <OpPill op={e.operation} />
                    {e.source === "version" && (
                      <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        change
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {e.doctype ? (
                      <>
                        <div className="font-semibold text-foreground">{e.doctype}</div>
                        {e.docname && <div className="font-mono text-muted-foreground">{e.docname}</div>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {e.changes.length > 0 ? (
                      <details className="group">
                        <summary className="cursor-pointer text-foreground">
                          {e.subject}{" "}
                          <span className="text-muted-foreground group-open:hidden">(show)</span>
                          <span className="hidden text-muted-foreground group-open:inline">(hide)</span>
                        </summary>
                        <ul className="mt-1 space-y-0.5 border-l-2 border-muted pl-2">
                          {e.changes.slice(0, 20).map((c) => (
                            <li key={c.field} className="text-[11px]">
                              <span className="font-mono text-primary">{c.field}</span>
                              <span className="mx-1 text-muted-foreground">:</span>
                              <span className="text-rose-700 line-through">{abbrev(c.from)}</span>
                              <span className="mx-1 text-muted-foreground">→</span>
                              <span className="text-emerald-700">{abbrev(c.to)}</span>
                            </li>
                          ))}
                          {e.changes.length > 20 && (
                            <li className="text-[11px] italic text-muted-foreground">
                              + {e.changes.length - 20} more
                            </li>
                          )}
                        </ul>
                      </details>
                    ) : (
                      <span className="text-foreground">{e.subject || "—"}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpPill({ op }: { op: string }) {
  const colour =
    op === "Login" ? "bg-emerald-100 text-emerald-700"
    : op === "Logout" ? "bg-slate-200 text-slate-700"
    : op === "Created" ? "bg-primary/10 text-primary"
    : op === "Updated" ? "bg-amber-100 text-amber-800"
    : op === "Deleted" ? "bg-rose-100 text-rose-700"
    : "bg-muted text-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${colour}`}>
      {op}
    </span>
  );
}

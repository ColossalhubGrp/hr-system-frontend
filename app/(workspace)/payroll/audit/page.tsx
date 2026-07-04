import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { frappeCall } from "@/lib/frappe/client";

export const metadata = { title: "Audit · Payroll · Colossal HR" };

type AuditChange = { field: string; from: string; to: string };
type AuditRow = {
  version: string;
  doctype: string;
  docname: string;
  user: string;
  at: string;
  changes: AuditChange[];
  added: boolean;
  removed: boolean;
};

async function loadAudit(): Promise<AuditRow[]> {
  try {
    const res = await frappeCall<{ rows?: AuditRow[] } | { message?: { rows?: AuditRow[] } }>({
      method: "tenant_manager.payroll_engine.api.audit.list_recent",
      args: { limit: 200 },
      as: "user",
    });
    const unwrapped =
      (res && typeof res === "object" && "message" in res
        ? (res as { message?: { rows?: AuditRow[] } }).message
        : res) || {};
    return ("rows" in unwrapped ? unwrapped.rows : []) ?? [];
  } catch (err) {
    console.error("[payroll] audit failed:", err);
    return [];
  }
}

export default async function PayrollAuditTab() {
  const rows = await loadAudit();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-foreground">
          Audit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent edits to pay runs, payslips, employee payroll fields,
          pay grades, NEC industries, and settings. Every save across
          the payroll module is recorded automatically.
        </p>
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">When</TableHead>
              <TableHead className="px-5">User</TableHead>
              <TableHead className="px-5">Record</TableHead>
              <TableHead className="px-5">Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No recorded activity yet, or you don't have permission
                  to view the audit trail.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.version}>
                  <TableCell className="px-5 align-top text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(r.at)}
                  </TableCell>
                  <TableCell className="px-5 align-top text-sm">{r.user}</TableCell>
                  <TableCell className="px-5 align-top">
                    <p className="text-sm font-semibold">{r.doctype}</p>
                    <p className="text-xs text-muted-foreground">{r.docname}</p>
                  </TableCell>
                  <TableCell className="px-5 align-top">
                    {r.changes.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {r.added
                          ? "row added"
                          : r.removed
                            ? "row removed"
                            : "metadata"}
                      </span>
                    ) : (
                      <ul className="space-y-0.5 text-xs">
                        {r.changes.map((c, i) => (
                          <li key={i}>
                            <code className="rounded bg-muted/40 px-1 py-0.5">
                              {c.field}
                            </code>{" "}
                            <span className="text-muted-foreground">
                              {c.from || "∅"}
                            </span>{" "}
                            →{" "}
                            <span className="font-semibold">
                              {c.to || "∅"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function fmtDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

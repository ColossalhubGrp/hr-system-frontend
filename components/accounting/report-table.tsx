import type { ReportColumn } from "@/lib/frappe/accounting-reports";

/**
 * Server-rendered table for an ERPNext query-report result. We keep it
 * a plain server component: the whole report is fetched on the server
 * and painted once — no client-side pagination or sort. If a report
 * grows large enough to need those, we'll add per-report chunking.
 */
export function ReportTable({
  columns,
  rows,
  empty,
}: {
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  empty?: React.ReactNode;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {empty ?? "Nothing to show for this range."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.fieldname || c.label}
                className={`px-3 py-2 ${isNumericType(c.fieldtype) ? "text-right" : "text-left"}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isBold = truthy(row.is_total) || truthy(row.bold) || truthy(row.is_group);
            return (
              <tr
                key={i}
                className={`border-b border-border/30 last:border-0 ${
                  isBold ? "bg-muted/10 font-semibold" : ""
                }`}
              >
                {columns.map((c) => {
                  const v = row[c.fieldname];
                  const indent = Number(row.indent ?? 0) * 12;
                  const cellClass = `px-3 py-1.5 ${isNumericType(c.fieldtype) ? "text-right tabular-nums" : "text-left"}`;
                  return (
                    <td key={c.fieldname || c.label} className={cellClass}>
                      {isFirstTextCol(c, columns) ? (
                        <span style={{ paddingLeft: `${indent}px` }}>{renderCell(v, c)}</span>
                      ) : (
                        renderCell(v, c)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function isFirstTextCol(c: ReportColumn, cols: ReportColumn[]) {
  const firstText = cols.find((x) => !isNumericType(x.fieldtype));
  return firstText?.fieldname === c.fieldname;
}

function isNumericType(t: string) {
  return t === "Float" || t === "Currency" || t === "Int" || t === "Percent";
}

function truthy(v: unknown) {
  return v === true || v === 1 || v === "1";
}

function renderCell(v: unknown, c: ReportColumn): string {
  if (v === undefined || v === null || v === "") return "—";
  if (c.fieldtype === "Currency" || c.fieldtype === "Float") {
    const n = Number(v);
    if (!isFinite(n)) return String(v);
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (c.fieldtype === "Int") {
    return String(Math.round(Number(v)));
  }
  if (c.fieldtype === "Percent") {
    return `${Number(v).toFixed(2)}%`;
  }
  if (c.fieldtype === "Check") {
    return truthy(v) ? "Yes" : "No";
  }
  return String(v);
}

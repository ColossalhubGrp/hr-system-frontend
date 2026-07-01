import Link from "next/link";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { listPayRuns, listPayStubsForRun } from "@/lib/payroll-engine/server";
import {
  listPayrollEmployees,
  listTaxNotices,
} from "@/lib/payroll-engine/doctype-helpers";

export const metadata = { title: "Docs · Payroll · Colossal HR" };

const SECTIONS = [
  { key: "stubs", label: "Pay Stubs" },
  { key: "forms", label: "Tax Forms (W-2 / 1099)" },
  { key: "filings", label: "Tax Filings" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default async function DocsTab({
  searchParams,
}: {
  searchParams: { doc?: string };
}) {
  const doc = ((searchParams.doc as SectionKey) ?? "stubs") as SectionKey;
  const [runs, employees, notices] = await Promise.all([
    listPayRuns(),
    listPayrollEmployees(),
    listTaxNotices(),
  ]);
  // Approved-or-paid runs only — drafts shouldn't surface payslips.
  const paid = runs.filter(
    (r) => r.status === "PAID" || r.status === "APPROVED",
  );

  // Stubs need per-run stub fetch; lazy load for visible runs only.
  const paidStubs =
    doc === "stubs"
      ? await Promise.all(
          paid.slice(0, 12).map(async (r) => ({
            run: r,
            stubs: await listPayStubsForRun(r.id),
          })),
        )
      : [];

  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-foreground">
          Documents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay stubs, year-end tax forms and government filings — rendered as
          PDF on download.
        </p>
      </header>

      <div className="flex flex-wrap gap-1">
        {SECTIONS.map((s) => (
          <Link
            key={s.key}
            href={`/payroll/docs?doc=${s.key}` as Route}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              doc === s.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/40",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Document</TableHead>
              <TableHead className="px-5">Detail</TableHead>
              <TableHead className="px-5">Date</TableHead>
              <TableHead className="px-5 text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc === "stubs" &&
              paidStubs.flatMap(({ run, stubs }) =>
                stubs
                  .filter((s) => s.included)
                  .map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="px-5 align-middle font-semibold">
                        Pay stub — {s.employeeName}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-muted-foreground">
                        {run.label} · {money(s.netPay)} net
                      </TableCell>
                      <TableCell className="px-5 align-middle">
                        {fmtDate(run.payDate)}
                      </TableCell>
                      <TableCell className="px-5 text-right align-middle">
                        <PdfLink
                          href={`/api/payroll/documents/pay-stub?slip=${encodeURIComponent(s.id)}`}
                          label="PDF"
                        />
                      </TableCell>
                    </TableRow>
                  )),
              )}
            {doc === "forms" &&
              employees.map((e) => {
                const is1099 = e.payType === "CONTRACTOR";
                const form = is1099 ? "1099-NEC" : "W-2";
                return (
                  <TableRow key={e.name}>
                    <TableCell className="px-5 align-middle font-semibold">
                      {form} ({year}) — {e.employeeName}
                    </TableCell>
                    <TableCell className="px-5 align-middle text-muted-foreground">
                      {e.designation ?? "—"} · {e.department ?? "—"}
                    </TableCell>
                    <TableCell className="px-5 align-middle">
                      Jan 31, {year + 1}
                    </TableCell>
                    <TableCell className="px-5 text-right align-middle">
                      {is1099 ? (
                        <span className="text-xs text-muted-foreground">
                          1099-NEC template coming soon
                        </span>
                      ) : (
                        <PdfLink
                          href={`/api/payroll/documents/w2?employee=${encodeURIComponent(e.name)}&year=${year}`}
                          label="PDF"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            {doc === "filings" &&
              notices.map((n) => (
                <TableRow key={n.name}>
                  <TableCell className="px-5 align-middle font-semibold">
                    {n.form}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">
                    {n.agency} · {n.jurisdiction ?? "—"} · {n.period ?? "—"} ·{" "}
                    {n.amount ? money(n.amount) : "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    {n.due_date ? fmtDate(n.due_date) : "—"}
                  </TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <span className="text-xs text-muted-foreground">
                      Manual filing
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            {((doc === "stubs" && paidStubs.length === 0) ||
              (doc === "forms" && employees.length === 0) ||
              (doc === "filings" && notices.length === 0)) && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No documents in this section yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function PdfLink({ href, label }: { href: string; label: string }) {
  // Plain <a> — the route handler streams the file with the right
  // Content-Disposition so the browser triggers a download.
  return (
    <a
      href={href}
      className="text-xs font-semibold text-primary hover:underline"
    >
      {label}
    </a>
  );
}

function money(n: number): string {
  return `$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

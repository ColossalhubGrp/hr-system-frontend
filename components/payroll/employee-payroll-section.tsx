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
import {
  listPayslipsForEmployee,
  type EmployeeSlip,
} from "@/lib/payroll-engine/payruns";

const num = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Belina-flow recent-payslips register, mounted on the Payroll tab of
 * `/employee/[id]`. Reads from Payroll Run Payslip (child of Payroll
 * Run) — NOT ERPNext's Salary Slip, which we no longer produce.
 */
export async function EmployeePayrollSection({
  employeeId,
}: {
  employeeId: string;
  /** Legacy prop from the ERPNext-era section — kept for backwards
   *  compat with the caller but unused (data path is identical for
   *  self-service vs admin). */
  selfService?: boolean;
}) {
  const slips = await listPayslipsForEmployee(employeeId, 12);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent payslips
      </h3>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Period</TableHead>
              <TableHead className="px-5">Pay date</TableHead>
              <TableHead className="px-5 text-right">Gross USD</TableHead>
              <TableHead className="px-5 text-right">Gross ZiG</TableHead>
              <TableHead className="px-5 text-right">PAYE</TableHead>
              <TableHead className="px-5 text-right">NSSA</TableHead>
              <TableHead className="px-5 text-right">Net USD</TableHead>
              <TableHead className="px-5 text-right">Net ZiG</TableHead>
              <TableHead className="px-5 text-right">Payslip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No payslips yet — the first run that includes this
                  employee will appear here after it&apos;s processed.
                </TableCell>
              </TableRow>
            ) : (
              slips.map((s) => (
                <SlipRow key={s.name} slip={s} employeeId={employeeId} />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SlipRow({ slip, employeeId }: { slip: EmployeeSlip; employeeId: string }) {
  const label = slip.is_off_cycle
    ? `${slip.period_label} · ${slip.run_type[0]}${slip.run_type.slice(1).toLowerCase()}`
    : slip.period_label;
  return (
    <TableRow>
      <TableCell className="px-5 align-middle font-semibold">{label}</TableCell>
      <TableCell className="px-5 align-middle text-muted-foreground">
        {fmtDate(slip.pay_date)}
      </TableCell>
      <TableCell className="px-5 align-middle text-right">
        {slip.gross_usd ? num(slip.gross_usd) : "—"}
      </TableCell>
      <TableCell className="px-5 align-middle text-right">
        {slip.gross_zig ? num(slip.gross_zig) : "—"}
      </TableCell>
      <TableCell className="px-5 align-middle text-right text-muted-foreground">
        {slip.paye_usd ? num(slip.paye_usd) : "—"}
      </TableCell>
      <TableCell className="px-5 align-middle text-right text-muted-foreground">
        {slip.nssa_employee ? num(slip.nssa_employee) : "—"}
      </TableCell>
      <TableCell className="px-5 align-middle text-right font-semibold">
        {slip.net_usd ? num(slip.net_usd) : "—"}
      </TableCell>
      <TableCell className="px-5 align-middle text-right font-semibold">
        {slip.net_zig ? num(slip.net_zig) : "—"}
      </TableCell>
      <TableCell className="px-5 align-middle text-right">
        <Link
          href={
            `/payroll/${encodeURIComponent(slip.run)}/payslip/${encodeURIComponent(employeeId)}` as Route
          }
          className="text-xs font-semibold text-primary hover:underline"
        >
          Open →
        </Link>
      </TableCell>
    </TableRow>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getPayslipDetail } from "@/lib/payroll-engine/payruns";
import { DownloadPayslipButton } from "@/components/payroll/download-payslip-button";

export const metadata = { title: "Payslip · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const zig = (n: number) =>
  `ZiG ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtPeriodForFilename(label: string, payDate: string): string {
  // Prefer YYYY-MM from the pay date because it sorts naturally.
  if (payDate) {
    const s = payDate.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(s)) return s;
  }
  return (label || "period").replace(/[^\p{L}\p{N}\-]+/gu, "_");
}

export default async function PayslipPage({
  params,
  searchParams,
}: {
  params: { id: string; empId: string };
  searchParams: { from?: string };
}) {
  const runId = decodeURIComponent(params.id);
  const empId = decodeURIComponent(params.empId);
  const data = await getPayslipDetail(runId, empId);
  if (!data) notFound();
  // Employees landing here from /me/payslips should go BACK to their own
  // payslip list, not the payroll admin's pay-run view (which they may
  // not even have permission to see). Payroll admins clicking through
  // from /payroll/<run> keep the pay-run destination.
  const fromMe = searchParams?.from === "me";
  const backHref = fromMe ? "/me/payslips" : `/payroll/${encodeURIComponent(runId)}`;
  const backLabel = fromMe ? "← Back to my payslips" : "← Back to pay run";

  const { run, company, employee, slip, earnings, deductions } = data;
  const pensionZig = employee.basic_zig * employee.pension_pct;
  const companyDisplay = company.legal_name || company.company_name;

  // Filename shape: "Payslip_Grace_Okafor_2026-06.pdf". Sanitize the
  // employee name so browsers accept the download; period_label like
  // "June 2026" is turned into "2026-06" when we can parse it.
  const safeName = (employee.employee_name || employee.name)
    .replace(/[^\p{L}\p{N}\-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const period = fmtPeriodForFilename(run.period_label, run.pay_date);
  const filename = `Payslip_${safeName}_${period}`;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={backHref as Route}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {backLabel}
        </Link>
        <DownloadPayslipButton targetId="payslip-card" filename={filename} />
      </div>

      <Card id="payslip-card" className="overflow-hidden p-0">
        {/* Company header — uses the system primary token so the
            payslip matches the brand palette (deep ink-purple) instead
            of an off-brand emerald. */}
        <div className="flex items-start justify-between gap-4 border-b bg-primary p-6 text-primary-foreground">
          <div>
            <div className="text-xl font-extrabold">{companyDisplay}</div>
            {company.address && (
              <div className="mt-1 text-xs text-primary-foreground/80">{company.address}</div>
            )}
            <div className="text-xs text-primary-foreground/80">
              {company.bp_number && <>ZIMRA BP: {company.bp_number}</>}
              {company.bp_number && company.nssa_employer_no ? " · " : ""}
              {company.nssa_employer_no && <>NSSA: {company.nssa_employer_no}</>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold uppercase tracking-wide">Payslip</div>
            <div className="text-xs text-primary-foreground/80">{run.period_label}</div>
            <div className="text-xs text-primary-foreground/80">
              Pay date {fmtDate(run.pay_date)}
            </div>
            <div className="text-xs text-primary-foreground/80">
              Rate ZiG {run.exchange_rate.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Employee block — name is the primary line, everything
            else supports it. Code + job title collapse into a subtitle
            so admins recognise the person, not a HR-EMP-XXXXX. */}
        <div className="border-b p-6">
          <div className="mb-4">
            <div className="text-xl font-extrabold text-foreground">
              {employee.employee_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {employee.name}
              {employee.job_title ? ` · ${employee.job_title}` : ""}
              {employee.nec_industry ? ` · ${employee.nec_industry}` : ""}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <Info label="National ID" value={employee.national_id ?? "—"} />
            <Info label="ZIMRA tax no." value={employee.tax_number ?? "—"} />
            <Info label="NSSA no." value={employee.nssa_number ?? "—"} />
            <Info label="Joining date" value={fmtDate(employee.date_of_joining ?? "")} />
            <Info
              label="Bank"
              value={
                [employee.bank_name, employee.bank_account]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
            <Info
              label="Monthly basic"
              value={`${usd(employee.basic_usd)} · ${zig(employee.basic_zig)}`}
            />
            <Info
              label="Pension"
              value={
                employee.pension_pct > 0
                  ? `${(employee.pension_pct * 100).toFixed(1)}%`
                  : "—"
              }
            />
          </div>
        </div>

        {/* Earnings + Deductions — split table, USD + ZiG columns each side */}
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-card p-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
              Earnings
            </h3>
            <MoneyTable
              rows={[
                { label: "Basic pay", u: employee.basic_usd, z: employee.basic_zig },
                ...earnings.map((t) => ({
                  key: t.name,
                  label: `${t.code}${t.taxable ? "" : " (non-tax)"}`,
                  u: t.currency === "USD" ? t.amount : 0,
                  z: t.currency === "ZWG" ? t.amount : 0,
                })),
              ]}
              total={{ label: "Gross earnings", u: slip.gross_usd, z: slip.gross_zig }}
            />
          </div>

          <div className="bg-card p-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
              Deductions
            </h3>
            <MoneyTable
              rows={[
                { label: "PAYE", u: slip.paye_usd, z: slip.paye_zig },
                ...(slip.tax_credits_usd > 0
                  ? [{ label: "Tax credits applied", u: -slip.tax_credits_usd, z: 0, tone: "credit" as const }]
                  : []),
                { label: "AIDS Levy (3%)", u: slip.aids_usd, z: slip.aids_zig },
                { label: "NSSA (4.5%)", u: slip.nssa_employee, z: 0 },
                ...(employee.pension_pct > 0
                  ? [{
                      label: `Pension (${Math.round(employee.pension_pct * 100)}%)`,
                      u: slip.pension_usd,
                      z: pensionZig,
                    }]
                  : []),
                ...(slip.medical_aid > 0
                  ? [{ label: "Medical aid", u: slip.medical_aid, z: 0 }]
                  : []),
                { label: "NEC dues", u: slip.nec_dues, z: 0 },
                ...deductions.map((t) => ({
                  key: t.name,
                  label: t.code,
                  u: t.currency === "USD" ? t.amount : 0,
                  z: t.currency === "ZWG" ? t.amount : 0,
                })),
              ]}
              total={{
                label: "Total deductions",
                u: slip.gross_usd - slip.net_usd,
                z: slip.gross_zig - slip.net_zig,
              }}
            />
          </div>
        </div>

        {/* Net pay */}
        <div className="flex items-center justify-between border-t bg-primary/10 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Net pay
            </div>
            <div className="text-xs text-muted-foreground">
              Taxable income: {usd(slip.gross_usd - slip.paye_usd - slip.nssa_employee)} /{" "}
              {zig(slip.gross_zig - slip.paye_zig)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-primary">{usd(slip.net_usd)}</div>
            <div className="text-lg font-bold text-primary">{zig(slip.net_zig)}</div>
          </div>
        </div>

        {/* Employer contributions */}
        <div className="border-t p-6 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            Employer contributions (company cost):{" "}
          </span>
          NSSA {usd(slip.nssa_employer)} · ZIMDEF {usd(slip.zimdef)} · AIDS Levy
          remitted with PAYE
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}

type MoneyRow = { key?: string; label: string; u: number; z: number; tone?: "credit" };
type MoneyTotal = { label: string; u: number; z: number };

const num = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Three-column money table: label | USD | ZiG. Column headers carry
 * the currency so cells only render the numeric value (no repeated
 * "US$" / "ZiG" prefix per row). Tabular-nums keeps digits aligned
 * across rows; empty cells fall back to a subtle "—". Totals sit
 * inside the same <table> so the columns keep aligning.
 */
function MoneyTable({ rows, total }: { rows: MoneyRow[]; total: MoneyTotal }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
          <th className="pb-1 text-left font-medium">Item</th>
          <th className="pb-1 text-right font-medium">USD</th>
          <th className="pb-1 text-right font-medium">ZiG</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.key ?? `${r.label}-${i}`}>
            <td className={`py-1 ${r.tone === "credit" ? "text-primary" : "text-foreground/80"}`}>
              {r.label}
            </td>
            <td className={`py-1 text-right ${r.tone === "credit" ? "text-primary" : ""}`}>
              {r.u ? (r.u < 0 ? `−${num(-r.u)}` : num(r.u)) : <span className="text-muted-foreground">—</span>}
            </td>
            <td className="py-1 text-right text-muted-foreground">
              {r.z ? num(r.z) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t font-bold">
          <td className="pt-2">{total.label}</td>
          <td className="pt-2 text-right">{num(total.u)}</td>
          <td className="pt-2 text-right">{num(total.z)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

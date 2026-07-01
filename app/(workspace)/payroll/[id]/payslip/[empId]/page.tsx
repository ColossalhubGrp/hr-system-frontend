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
}: {
  params: { id: string; empId: string };
}) {
  const runId = decodeURIComponent(params.id);
  const empId = decodeURIComponent(params.empId);
  const data = await getPayslipDetail(runId, empId);
  if (!data) notFound();

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
          href={`/payroll/${encodeURIComponent(runId)}` as Route}
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to pay run
        </Link>
        <DownloadPayslipButton targetId="payslip-card" filename={filename} />
      </div>

      <Card id="payslip-card" className="overflow-hidden p-0">
        {/* Company header */}
        <div className="flex items-start justify-between gap-4 border-b bg-emerald-600 p-6 text-white">
          <div>
            <div className="text-xl font-extrabold">{companyDisplay}</div>
            {company.address && (
              <div className="mt-1 text-xs text-emerald-50">{company.address}</div>
            )}
            <div className="text-xs text-emerald-50">
              {company.bp_number && <>ZIMRA BP: {company.bp_number}</>}
              {company.bp_number && company.nssa_employer_no ? " · " : ""}
              {company.nssa_employer_no && <>NSSA: {company.nssa_employer_no}</>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold uppercase tracking-wide">Payslip</div>
            <div className="text-xs text-emerald-50">{run.period_label}</div>
            <div className="text-xs text-emerald-50">
              Pay date {fmtDate(run.pay_date)}
            </div>
            <div className="text-xs text-emerald-50">
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

        {/* Earnings + Deductions */}
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-card p-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">
              Earnings
            </h3>
            <Line
              label="Basic pay"
              u={employee.basic_usd}
              z={employee.basic_zig}
            />
            {earnings.map((t) => (
              <Line
                key={t.name}
                label={`${t.code}${t.taxable ? "" : " (non-tax)"}`}
                u={t.currency === "USD" ? t.amount : 0}
                z={t.currency === "ZWG" ? t.amount : 0}
              />
            ))}
            <Total label="Gross earnings" u={slip.gross_usd} z={slip.gross_zig} />
          </div>

          <div className="bg-card p-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">
              Deductions
            </h3>
            <Line label="PAYE" u={slip.paye_usd} z={slip.paye_zig} />
            {slip.tax_credits_usd > 0 && (
              <div className="flex items-center justify-between py-1 text-sm text-emerald-700">
                <span>Tax credits applied</span>
                <span className="text-right">−{usd(slip.tax_credits_usd)}</span>
              </div>
            )}
            <Line label="AIDS Levy (3%)" u={slip.aids_usd} z={slip.aids_zig} />
            <Line label="NSSA (4.5%)" u={slip.nssa_employee} z={0} />
            {employee.pension_pct > 0 && (
              <Line
                label={`Pension (${Math.round(employee.pension_pct * 100)}%)`}
                u={slip.pension_usd}
                z={pensionZig}
              />
            )}
            {slip.medical_aid > 0 && (
              <Line label="Medical aid" u={slip.medical_aid} z={0} />
            )}
            <Line label="NEC dues" u={slip.nec_dues} z={0} />
            {deductions.map((t) => (
              <Line
                key={t.name}
                label={t.code}
                u={t.currency === "USD" ? t.amount : 0}
                z={t.currency === "ZWG" ? t.amount : 0}
              />
            ))}
            <Total
              label="Total deductions"
              u={slip.gross_usd - slip.net_usd}
              z={slip.gross_zig - slip.net_zig}
            />
          </div>
        </div>

        {/* Net pay */}
        <div className="flex items-center justify-between border-t bg-emerald-50 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Net pay
            </div>
            <div className="text-xs text-muted-foreground">
              Taxable income: {usd(slip.gross_usd - slip.paye_usd - slip.nssa_employee)} /{" "}
              {zig(slip.gross_zig - slip.paye_zig)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-emerald-700">{usd(slip.net_usd)}</div>
            <div className="text-lg font-bold text-emerald-700">{zig(slip.net_zig)}</div>
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

function Line({ label, u, z }: { label: string; u: number; z: number }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-foreground/80">{label}</span>
      <span className="text-right">
        {u ? usd(u) : ""}
        {u && z ? " · " : ""}
        {z ? <span className="text-muted-foreground">{zig(z)}</span> : ""}
        {!u && !z ? "—" : ""}
      </span>
    </div>
  );
}

function Total({ label, u, z }: { label: string; u: number; z: number }) {
  return (
    <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-bold">
      <span>{label}</span>
      <span>
        {usd(u)} · {zig(z)}
      </span>
    </div>
  );
}

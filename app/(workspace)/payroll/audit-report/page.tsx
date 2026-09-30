import { frappeCall } from "@/lib/frappe/client";
import { listPayRuns, listPayslipsForRun } from "@/lib/payroll-engine/payruns";
import { myCompany } from "@/lib/references/server";
import { readSession } from "@/lib/frappe/session";
import { PrintButton } from "@/components/payroll/print-button";

export const metadata = { title: "Payroll audit report · Colossal HR" };
export const dynamic = "force-dynamic";

const num = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (n: number) => `US$${num(n)}`;
const zig = (n: number) => `ZiG ${num(n)}`;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type SP = { from?: string; to?: string };

export default async function AuditReportPage({
  searchParams,
}: {
  searchParams?: SP;
}) {
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString().slice(0, 10);
  const from = (searchParams?.from || defaultFrom).slice(0, 10);
  const to   = (searchParams?.to   || defaultTo).slice(0, 10);

  const session = readSession();
  const generatedAt = new Date();

  const company = await myCompany();

  const cpsRows = company
    ? await frappeCall<Record<string, unknown>[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Company Payroll Settings",
          fields: ["name", "legal_name", "company_address", "bp_number", "nssa_employer_no"],
          filters: JSON.stringify([["name", "=", company]]),
          limit_page_length: 1,
        },
        as: "user",
      }).catch(() => [])
    : [];
  const cps = cpsRows[0] ?? {};

  const allRuns = await listPayRuns();
  const runs = allRuns
    .filter((r) => r.status === "PROCESSED" || r.status === "UPDATED")
    .filter((r) => {
      if (!r.pay_date) return false;
      const pd = r.pay_date.slice(0, 10);
      return pd >= from && pd <= to;
    })
    .sort((a, b) => (a.pay_date || "").localeCompare(b.pay_date || ""));

  const runsWithSlips = await Promise.all(
    runs.map(async (r) => ({ run: r, slips: await listPayslipsForRun(r.name) })),
  );
  const allSlips = runsWithSlips.flatMap((x) => x.slips);
  const t = allSlips.reduce(
    (a, s) => ({
      grossUsd: a.grossUsd + s.gross_usd,
      grossZig: a.grossZig + s.gross_zig,
      netUsd:   a.netUsd   + s.net_usd,
      netZig:   a.netZig   + s.net_zig,
      paye:     a.paye     + s.paye_usd,
      aids:     a.aids     + s.aids_usd,
      nssaEe:   a.nssaEe   + s.nssa_employee,
      nssaEr:   a.nssaEr   + s.nssa_employer,
      zimdef:   a.zimdef   + s.zimdef,
      pension:  a.pension  + s.pension_usd,
      medical:  a.medical  + s.medical_aid + s.nec_dues,
      other:    a.other    + s.other_deduct_usd,
      credits:  a.credits  + s.tax_credits_usd,
    }),
    { grossUsd: 0, grossZig: 0, netUsd: 0, netZig: 0, paye: 0, aids: 0,
      nssaEe: 0, nssaEr: 0, zimdef: 0, pension: 0, medical: 0, other: 0, credits: 0 },
  );
  const employerCost = t.grossUsd + t.nssaEr + t.zimdef;

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-4">
      {/* Controls — hidden on print */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Payroll · External audit
          </p>
          <h1 className="text-[28px] font-bold leading-tight text-foreground">
            Print-ready payroll report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a date range, then Print. The browser&apos;s print dialog
            also has &quot;Save as PDF&quot; for handing to auditors.
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="from" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From</label>
            <input type="date" id="from" name="from" defaultValue={from}
                   className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="to" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">To</label>
            <input type="date" id="to" name="to" defaultValue={to}
                   className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <button type="submit"
                  className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Update
          </button>
          <PrintButton label="Print / Save PDF" />
        </form>
      </div>

      {/* Printable article — everything below prints */}
      <article className="report-page rounded-xl border bg-white p-8 text-[13px] leading-relaxed text-black print:rounded-none print:border-0 print:p-0 print:text-[10.5pt]">
        {/* Cover block */}
        <header className="mb-6 border-b-2 border-black pb-5 report-avoid-break">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-[22px] font-extrabold uppercase tracking-wide">
                {(cps.legal_name as string) || company || "Company"}
              </div>
              {cps.company_address ? (
                <div className="mt-1 max-w-[420px] text-[11px] text-neutral-600">
                  {cps.company_address as string}
                </div>
              ) : null}
              <div className="mt-1 text-[11px] text-neutral-600">
                {cps.bp_number ? <>ZIMRA BP&nbsp;{cps.bp_number as string}</> : null}
                {cps.bp_number && cps.nssa_employer_no ? " · " : ""}
                {cps.nssa_employer_no ? <>NSSA Employer&nbsp;{cps.nssa_employer_no as string}</> : null}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Payroll audit report
              </div>
              <div className="mt-1 text-[15px] font-bold">
                {fmtDate(from)} – {fmtDate(to)}
              </div>
              <div className="mt-1 text-[10px] text-neutral-600">
                Generated {fmtDateTime(generatedAt)}
                {session.fullName ? <> · by {session.fullName}</> : session.userId ? <> · by {session.userId}</> : null}
              </div>
            </div>
          </div>
        </header>

        {runs.length === 0 ? (
          <p className="rounded-md border border-neutral-300 bg-neutral-50 p-6 text-center text-[13px] text-neutral-600">
            No processed pay runs in this window. Widen the date range and Update.
          </p>
        ) : (
          <>
            {/* Highlighted executive summary */}
            <section className="mb-6 report-avoid-break">
              <h2 className="mb-2 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-widest">
                Executive summary
              </h2>
              <div className="grid grid-cols-4 gap-x-6 gap-y-3">
                <KV label="Pay runs" value={String(runs.length)} big />
                <KV label="Employees paid" value={String(allSlips.length)} big />
                <KV label="Gross earnings" value={usd(t.grossUsd)} sub={zig(t.grossZig)} big highlight />
                <KV label="Net take-home" value={usd(t.netUsd)} sub={zig(t.netZig)} big highlight />
                <KV label="Total employer cost" value={usd(employerCost)} sub="Gross + NSSA (employer) + ZIMDEF" big highlight />
                <KV label="Tax credits applied" value={t.credits ? `−${usd(t.credits)}` : "—"} sub="Elderly + disabled + medical" />
              </div>
            </section>

            {/* Highlighted statutory remittances */}
            <section className="mb-6 report-avoid-break rounded-md border-2 border-black bg-neutral-50 p-4 print:bg-white">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest">
                Statutory remittances due
              </h2>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-neutral-400 text-left">
                    <th className="py-1 font-semibold">Head</th>
                    <th className="py-1 text-right font-semibold">Employees</th>
                    <th className="py-1 text-right font-semibold">Employer</th>
                    <th className="py-1 text-right font-semibold">Remit to</th>
                    <th className="py-1 text-right font-semibold">Total USD</th>
                  </tr>
                </thead>
                <tbody>
                  <RemittanceRow head="PAYE (income tax)" ee={t.paye} to="ZIMRA" />
                  <RemittanceRow head="AIDS Levy (3% of PAYE)" ee={t.aids} to="ZIMRA (with PAYE)" />
                  <RemittanceRow head="NSSA (POBS)" ee={t.nssaEe} er={t.nssaEr} to="NSSA" />
                  <RemittanceRow head="ZIMDEF (1% of gross)" er={t.zimdef} to="ZIMDEF" />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black font-bold">
                    <td className="pt-2">Total to statutory authorities</td>
                    <td className="pt-2 text-right">{usd(t.paye + t.aids + t.nssaEe)}</td>
                    <td className="pt-2 text-right">{usd(t.nssaEr + t.zimdef)}</td>
                    <td className="pt-2" />
                    <td className="pt-2 text-right">{usd(t.paye + t.aids + t.nssaEe + t.nssaEr + t.zimdef)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            {/* Per-run summary */}
            <section className="mb-6 report-avoid-break">
              <h2 className="mb-2 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-widest">
                Pay runs in period
              </h2>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-neutral-400 text-left">
                    <th className="py-1 font-semibold">Run</th>
                    <th className="py-1 font-semibold">Pay date</th>
                    <th className="py-1 text-right font-semibold">Employees</th>
                    <th className="py-1 text-right font-semibold">Gross USD</th>
                    <th className="py-1 text-right font-semibold">Statutory USD</th>
                    <th className="py-1 text-right font-semibold">Net USD</th>
                    <th className="py-1 text-right font-semibold">Net ZiG</th>
                  </tr>
                </thead>
                <tbody>
                  {runsWithSlips.map(({ run, slips }) => {
                    const g  = slips.reduce((s, x) => s + x.gross_usd, 0);
                    const n  = slips.reduce((s, x) => s + x.net_usd, 0);
                    const nz = slips.reduce((s, x) => s + x.net_zig, 0);
                    const st = slips.reduce((s, x) =>
                      s + x.paye_usd + x.aids_usd + x.nssa_employee + x.nssa_employer + x.zimdef, 0);
                    return (
                      <tr key={run.name} className="border-b border-neutral-200">
                        <td className="py-1">{run.period_label} <span className="text-[10px] text-neutral-500">({run.name})</span></td>
                        <td className="py-1">{fmtDate(run.pay_date)}</td>
                        <td className="py-1 text-right">{slips.length}</td>
                        <td className="py-1 text-right">{num(g)}</td>
                        <td className="py-1 text-right">{num(st)}</td>
                        <td className="py-1 text-right font-semibold">{num(n)}</td>
                        <td className="py-1 text-right font-semibold">{num(nz)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* Per-employee register — one section per run so page-breaks land cleanly */}
            {runsWithSlips.map(({ run, slips }) => (
              <section key={run.name} className="mb-6 report-break-before">
                <h2 className="mb-2 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-widest">
                  Payslip register · {run.period_label} · pay date {fmtDate(run.pay_date)}
                </h2>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-neutral-400 text-left">
                      <th className="py-1 font-semibold">Employee</th>
                      <th className="py-1 font-semibold">ID</th>
                      <th className="py-1 text-right font-semibold">Gross</th>
                      <th className="py-1 text-right font-semibold">PAYE</th>
                      <th className="py-1 text-right font-semibold">AIDS</th>
                      <th className="py-1 text-right font-semibold">NSSA</th>
                      <th className="py-1 text-right font-semibold">Pension</th>
                      <th className="py-1 text-right font-semibold">Med+NEC</th>
                      <th className="py-1 text-right font-semibold">Other</th>
                      <th className="py-1 text-right font-semibold">Net USD</th>
                      <th className="py-1 text-right font-semibold">Net ZiG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slips.length === 0 ? (
                      <tr><td colSpan={11} className="py-3 text-center text-neutral-500">No payslips.</td></tr>
                    ) : slips.map((s) => (
                      <tr key={s.name} className="border-b border-neutral-200">
                        <td className="py-1">{s.employee_name}</td>
                        <td className="py-1 text-neutral-600">{s.employee}</td>
                        <td className="py-1 text-right">{num(s.gross_usd)}</td>
                        <td className="py-1 text-right">{num(s.paye_usd)}</td>
                        <td className="py-1 text-right">{num(s.aids_usd)}</td>
                        <td className="py-1 text-right">{num(s.nssa_employee)}</td>
                        <td className="py-1 text-right">{s.pension_usd ? num(s.pension_usd) : "—"}</td>
                        <td className="py-1 text-right">{s.medical_aid + s.nec_dues ? num(s.medical_aid + s.nec_dues) : "—"}</td>
                        <td className="py-1 text-right">{s.other_deduct_usd ? num(s.other_deduct_usd) : "—"}</td>
                        <td className="py-1 text-right font-semibold">{num(s.net_usd)}</td>
                        <td className="py-1 text-right font-semibold">{num(s.net_zig)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {slips.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-black font-bold">
                        <td className="pt-1" colSpan={2}>Total ({slips.length})</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.gross_usd, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.paye_usd, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.aids_usd, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.nssa_employee, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.pension_usd, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.medical_aid + s.nec_dues, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.other_deduct_usd, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.net_usd, 0))}</td>
                        <td className="pt-1 text-right">{num(slips.reduce((a, s) => a + s.net_zig, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </section>
            ))}

            {/* Signature block */}
            <section className="mt-8 report-avoid-break">
              <h2 className="mb-6 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-widest">
                Certification
              </h2>
              <p className="mb-8 text-[12px]">
                The undersigned certify that the payroll figures above have been reviewed
                against source records for the period {fmtDate(from)} – {fmtDate(to)}
                and are, to the best of our knowledge, a true and fair reflection of
                remuneration paid and statutory obligations incurred.
              </p>
              <div className="grid grid-cols-3 gap-6">
                <Signature label="Prepared by" />
                <Signature label="Reviewed by" />
                <Signature label="Approved by" />
              </div>
            </section>
          </>
        )}
      </article>

      {/* Print CSS — hide app chrome, force landscape, keep colours */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body * { visibility: hidden; }
          .report-page, .report-page * { visibility: visible; }
          .report-page {
            position: absolute;
            inset: 0;
            width: 100%;
            box-shadow: none;
          }
          .report-avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .report-break-before { break-before: page; page-break-before: always; }
          .report-break-before:first-of-type { break-before: auto; page-break-before: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </div>
  );
}

function KV({
  label, value, sub, big, highlight,
}: {
  label: string; value: string; sub?: string; big?: boolean; highlight?: boolean;
}) {
  return (
    <div className={highlight ? "rounded-md border-2 border-black px-3 py-2 print:bg-white" : ""}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className={`font-bold ${big ? "text-[15px]" : "text-[13px]"}`}>{value}</div>
      {sub ? <div className="text-[10px] text-neutral-500">{sub}</div> : null}
    </div>
  );
}

function RemittanceRow({
  head, ee, er, to,
}: {
  head: string; ee?: number; er?: number; to: string;
}) {
  const total = (ee ?? 0) + (er ?? 0);
  return (
    <tr className="border-b border-neutral-200">
      <td className="py-1">{head}</td>
      <td className="py-1 text-right">{ee ? num(ee) : "—"}</td>
      <td className="py-1 text-right">{er ? num(er) : "—"}</td>
      <td className="py-1 text-right text-neutral-600">{to}</td>
      <td className="py-1 text-right font-semibold">{num(total)}</td>
    </tr>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 h-10 border-b border-black" />
      <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">{label}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-neutral-600">
        <div>
          <div className="mb-1 border-b border-neutral-400 pb-0.5">&nbsp;</div>
          <div>Name</div>
        </div>
        <div>
          <div className="mb-1 border-b border-neutral-400 pb-0.5">&nbsp;</div>
          <div>Date</div>
        </div>
      </div>
    </div>
  );
}

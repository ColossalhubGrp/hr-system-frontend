import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getSettings,
  listUsdBands,
  deriveZigBands,
} from "@/lib/payroll-engine/belina-settings";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

const usd = (n: number) =>
  `$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const zig = (n: number) =>
  `ZiG ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const [s, usdBands] = await Promise.all([getSettings(), listUsdBands()]);
  if (!s) {
    return (
      <div className="text-sm text-muted-foreground">
        Couldn&apos;t load Settings — sign in again, or check that a
        Company is set on your User.
      </div>
    );
  }
  const zigBands = deriveZigBands(s.interbank_rate, usdBands);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-sm text-muted-foreground">
          Company identity, statutory rates and ZIMRA PAYE tables.
        </p>
      </header>

      {searchParams.saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          ✓ Settings saved.
        </div>
      )}

      <form action={saveSettings} className="space-y-6">
        <Section title="Company">
          <T name="companyName" label="Company name" v={s.legal_name ?? ""} />
          <T name="address" label="Address" v={s.company_address ?? ""} />
          <T name="bpNumber" label="ZIMRA BP number" v={s.bp_number ?? ""} />
          <T name="nssaEmployerNo" label="NSSA employer no." v={s.nssa_employer_no ?? ""} />
          <T name="zimdefNo" label="ZIMDEF / Manpower no." v={s.zimdef_no ?? ""} />
        </Section>

        <Section title="Statutory rates">
          <N name="exchangeRate" label="Interbank rate (ZiG per US$1)" v={s.interbank_rate} />
          <N name="aidsLevyPct" label="AIDS Levy % (of PAYE)" v={s.aids_levy_pct * 100} />
          <N name="nssaPct" label="NSSA % (each side)" v={s.nssa_pct * 100} />
          <N name="nssaCeilingUsd" label="NSSA insurable ceiling (US$)" v={s.nssa_ceiling_usd} />
          <N name="zimdefPct" label="ZIMDEF % (of gross)" v={s.zimdef_pct * 100} />
          <N name="bonusTaxFreeUsd" label="Bonus tax-free (US$)" v={s.bonus_tax_free_usd} />
        </Section>

        {/*
         * Platform extras — not part of Belina's Settings page but kept
         * here so admins can still configure cadence + automation +
         * paying bank in one place.
         */}
        <Card className="p-6">
          <h2 className="mb-1 font-bold text-foreground">Platform extras</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Cadence, automation, and the company&apos;s paying bank — used by
            the New Pay Run form and the approve flow.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">
                Pay frequency
              </span>
              <select
                name="pay_frequency"
                defaultValue={s.pay_frequency}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {["Weekly", "Bi-weekly", "Semi-monthly", "Monthly", "Daily"].map(
                  (o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ),
                )}
              </select>
            </label>
            <T name="pay_day" label="Pay day rule" v={s.pay_day ?? ""} />
            <N
              name="approval_lead_days"
              label="Approval lead time (days)"
              v={s.approval_lead_days}
            />
            <div />
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-semibold text-foreground">
                Automation
              </span>
              <div className="flex flex-col gap-2 rounded-md border border-input bg-transparent px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="auto_run"
                    value="true"
                    defaultChecked={Boolean(s.auto_run)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-muted-foreground">
                    Auto-create the next pay run when one is approved.
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="email_payslips_on_approve"
                    value="true"
                    defaultChecked={Boolean(s.email_payslips_on_approve)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-muted-foreground">
                    Email each employee a PDF payslip on approve (uses
                    personal_email, fallback company_email).
                  </span>
                </label>
              </div>
            </label>
            <T
              name="bank_name"
              label="Paying bank"
              v={s.bank_name ?? ""}
            />
            <T
              name="bank_last4"
              label="Bank account (last 4)"
              v={s.bank_last4 ?? ""}
            />
            <T
              name="default_work_location"
              label="Default work location"
              v={s.default_work_location ?? ""}
            />
          </div>
        </Card>

        {/* USD PAYE table (editable) */}
        <Card className="p-6">
          <h2 className="mb-1 font-bold text-foreground">USD PAYE table (monthly)</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            ZIMRA 2025 bands. Tax = income × rate − deduction within the band.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Band (USD)</TableHead>
                <TableHead className="text-right">Rate %</TableHead>
                <TableHead className="text-right">Deduct</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usdBands.map((b) => (
                <TableRow key={b.name ?? b.seq}>
                  <TableCell>
                    {usd(b.lower)} – {b.upper === null ? "and above" : usd(b.upper)}
                  </TableCell>
                  <TableCell className="text-right">
                    <input
                      name={`band_${b.name}_rate`}
                      type="number"
                      step="any"
                      defaultValue={b.rate * 100}
                      className="h-9 w-20 rounded-md border border-input bg-transparent px-2 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <input
                      name={`band_${b.name}_deduct`}
                      type="number"
                      step="any"
                      defaultValue={b.deduct}
                      className="h-9 w-24 rounded-md border border-input bg-transparent px-2 text-right text-sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Save settings
          </button>
        </div>
      </form>

      {/* ZiG table (auto-derived, read-only) */}
      <Card className="p-6">
        <h2 className="mb-1 font-bold text-foreground">ZiG PAYE table (auto-derived)</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Derived from the USD table × the interbank rate (ZiG{" "}
          {s.interbank_rate.toFixed(2)}), matching how ZIMRA scales the ZiG table.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Band (ZiG)</TableHead>
              <TableHead className="text-right">Rate %</TableHead>
              <TableHead className="text-right">Deduct</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zigBands.map((b) => (
              <TableRow key={b.seq}>
                <TableCell>
                  {zig(b.lower)} – {b.upper === null ? "and above" : zig(b.upper)}
                </TableCell>
                <TableCell className="text-right">{(b.rate * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right">{b.deduct.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 font-bold text-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function T({ name, label, v }: { name: string; label: string; v: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-semibold text-foreground">{label}</span>
      <input
        name={name}
        defaultValue={v}
        className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      />
    </label>
  );
}

function N({ name, label, v }: { name: string; label: string; v: number }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-semibold text-foreground">{label}</span>
      <input
        name={name}
        type="number"
        step="any"
        defaultValue={v}
        className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      />
    </label>
  );
}

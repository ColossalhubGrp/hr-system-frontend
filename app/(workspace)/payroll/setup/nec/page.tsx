import Link from "next/link";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listNecIndustries, listBanks } from "@/lib/payroll-engine/setup";
import { AddRecordModal, EditRecordModal } from "@/components/payroll/setup-modal";
import { DeleteButton } from "@/components/payroll/row-actions";
import {
  addNec,
  updateNecAction,
  deleteNecAction,
} from "@/app/(workspace)/payroll/setup/actions";

export const metadata = { title: "NEC / Industry · Setup · Payroll" };
export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function NecPage() {
  const [list, banks] = await Promise.all([listNecIndustries(), listBanks()]);
  const bankOptions = ["", ...banks.map((b) => b.name)];

  const fields = (defaults: Partial<Record<string, string | number>> = {}) => [
    { name: "name", label: "NEC / industry name", placeholder: "Commercial / NEC", defaultValue: defaults.name as string ?? "" },
    { name: "councilName", label: "Council name", placeholder: "NEC for Commercial Sectors", defaultValue: defaults.councilName as string ?? "" },
    { name: "bpNumber", label: "ZIMRA BP number", placeholder: "BP…", defaultValue: defaults.bpNumber as string ?? "" },
    {
      name: "remittanceBank",
      label: "Remittance bank",
      type: "select" as const,
      options: bankOptions,
      defaultValue: defaults.remittanceBank as string ?? "",
    },
    { name: "duesAmountUsd", label: "Dues (USD, fixed)", type: "number" as const, defaultValue: (defaults.duesAmountUsd as number) ?? 0 },
    { name: "duesPct", label: "Dues (%, if not fixed)", type: "number" as const, defaultValue: (defaults.duesPct as number) ?? 0 },
    { name: "employerSharePct", label: "Employer share (%)", type: "number" as const, defaultValue: (defaults.employerSharePct as number) ?? 50 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            National Employment Councils each employee falls under. Rates
            here feed the sectoral return; the per-grade schedule (via
            the Schedule link) drives salary auto-fill on the employee
            edit form.
          </p>
        </div>
        <AddRecordModal
          title="Add NEC / industry"
          buttonLabel="+ Add NEC"
          action={addNec}
          fields={fields()}
        />
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">NEC / Industry</TableHead>
              <TableHead className="px-5">BP number</TableHead>
              <TableHead className="px-5">Bank</TableHead>
              <TableHead className="px-5 text-right">Dues</TableHead>
              <TableHead className="px-5">Schedule</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No industries yet.
                </TableCell>
              </TableRow>
            ) : (
              list.map((x) => (
                <TableRow key={x.name}>
                  <TableCell className="px-5 align-middle font-semibold">{x.industry_name}</TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">
                    {x.bp_number || "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">
                    {x.remittance_bank || "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right text-muted-foreground">
                    {x.dues_amount_usd
                      ? `US$${usd(x.dues_amount_usd)}`
                      : x.dues_pct
                        ? `${x.dues_pct}%`
                        : "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    <Link
                      href={`/payroll/setup/nec/${encodeURIComponent(x.name)}/schedule` as Route}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Edit schedule →
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      <EditRecordModal
                        id={x.name}
                        title="Edit NEC / industry"
                        action={updateNecAction}
                        fields={fields({
                          name: x.industry_name,
                          councilName: x.council_name ?? "",
                          bpNumber: x.bp_number ?? "",
                          remittanceBank: x.remittance_bank ?? "",
                          duesAmountUsd: x.dues_amount_usd ?? 0,
                          duesPct: x.dues_pct ?? 0,
                          employerSharePct: x.employer_share_pct ?? 50,
                        })}
                      />
                      <DeleteButton
                        id={x.name}
                        confirmText="Delete this NEC?"
                        action={deleteNecAction}
                      />
                    </div>
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

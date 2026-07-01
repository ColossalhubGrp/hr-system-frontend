import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listBanks } from "@/lib/payroll-engine/setup";
import { AddRecordModal, EditRecordModal } from "@/components/payroll/setup-modal";
import { DeleteButton } from "@/components/payroll/row-actions";
import {
  addBank,
  updateBankAction,
  deleteBankAction,
} from "@/app/(workspace)/payroll/setup/actions";

export const metadata = { title: "Banks · Setup · Payroll" };
export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const banks = await listBanks();
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Bank list used when paying employees (EFT).
          </p>
        </div>
        <AddRecordModal
          title="Add bank"
          buttonLabel="+ Add bank"
          action={addBank}
          fields={[
            { name: "name", label: "Bank name" },
            { name: "branch", label: "Branch" },
            { name: "sortCode", label: "Sort / branch code" },
          ]}
        />
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Bank</TableHead>
              <TableHead className="px-5">Branch</TableHead>
              <TableHead className="px-5">Sort code</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No banks yet.
                </TableCell>
              </TableRow>
            ) : (
              banks.map((b) => (
                <TableRow key={b.name}>
                  <TableCell className="px-5 align-middle font-semibold">{b.bank_name}</TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">{b.branch || "—"}</TableCell>
                  <TableCell className="px-5 align-middle font-mono text-xs">{b.sort_code || "—"}</TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      <EditRecordModal
                        id={b.name}
                        title="Edit bank"
                        action={updateBankAction}
                        fields={[
                          { name: "name", label: "Bank name", defaultValue: b.bank_name },
                          { name: "branch", label: "Branch", defaultValue: b.branch ?? "" },
                          { name: "sortCode", label: "Sort / branch code", defaultValue: b.sort_code ?? "" },
                        ]}
                      />
                      <DeleteButton
                        id={b.name}
                        confirmText="Delete this bank?"
                        action={deleteBankAction}
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

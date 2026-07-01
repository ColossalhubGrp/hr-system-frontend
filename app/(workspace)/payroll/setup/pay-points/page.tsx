import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listPayPoints } from "@/lib/payroll-engine/setup";
import { AddRecordModal, EditRecordModal } from "@/components/payroll/setup-modal";
import { DeleteButton } from "@/components/payroll/row-actions";
import {
  addPayPoint,
  updatePayPointAction,
  deletePayPointAction,
} from "@/app/(workspace)/payroll/setup/actions";

export const metadata = { title: "Pay Points · Setup · Payroll" };
export const dynamic = "force-dynamic";

export default async function PayPointsPage() {
  const points = await listPayPoints();
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Branches / locations employees are paid from.
          </p>
        </div>
        <AddRecordModal
          title="Add pay point"
          buttonLabel="+ Add pay point"
          action={addPayPoint}
          fields={[
            { name: "name", label: "Pay point name" },
            { name: "location", label: "Location / town" },
          ]}
        />
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Pay point</TableHead>
              <TableHead className="px-5">Location</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No pay points yet.
                </TableCell>
              </TableRow>
            ) : (
              points.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="px-5 align-middle font-semibold">{p.pay_point_name}</TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">{p.location || "—"}</TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      <EditRecordModal
                        id={p.name}
                        title="Edit pay point"
                        action={updatePayPointAction}
                        fields={[
                          { name: "name", label: "Pay point name", defaultValue: p.pay_point_name },
                          { name: "location", label: "Location / town", defaultValue: p.location ?? "" },
                        ]}
                      />
                      <DeleteButton
                        id={p.name}
                        confirmText="Delete this pay point?"
                        action={deletePayPointAction}
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

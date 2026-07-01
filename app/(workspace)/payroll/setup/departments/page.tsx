import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listDepartments } from "@/lib/payroll-engine/setup";
import { AddRecordModal, EditRecordModal } from "@/components/payroll/setup-modal";
import { DeleteButton } from "@/components/payroll/row-actions";
import {
  addDepartment,
  updateDepartmentAction,
  deleteDepartmentAction,
} from "@/app/(workspace)/payroll/setup/actions";

export const metadata = { title: "Departments · Setup · Payroll" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const rows = await listDepartments();
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Departments and their cost centres, used for grouping and reporting.
          </p>
        </div>
        <AddRecordModal
          title="Add department"
          buttonLabel="+ Add department"
          action={addDepartment}
          fields={[
            { name: "name", label: "Department name" },
            { name: "costCentre", label: "Cost centre", placeholder: "CC100" },
          ]}
        />
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Department</TableHead>
              <TableHead className="px-5">Cost centre</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No departments yet on this company.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((d) => (
                <TableRow key={d.name}>
                  <TableCell className="px-5 align-middle font-semibold">{d.department}</TableCell>
                  <TableCell className="px-5 align-middle font-mono text-xs">{d.cost_centre || "—"}</TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      <EditRecordModal
                        id={d.name}
                        title="Edit department"
                        action={updateDepartmentAction}
                        fields={[
                          { name: "name", label: "Department name", defaultValue: d.department },
                          { name: "costCentre", label: "Cost centre", defaultValue: d.cost_centre ?? "" },
                        ]}
                      />
                      <DeleteButton
                        id={d.name}
                        confirmText="Delete this department?"
                        action={deleteDepartmentAction}
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

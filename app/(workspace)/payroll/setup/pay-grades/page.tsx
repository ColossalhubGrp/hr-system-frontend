import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listPayGrades, listGradingSystems } from "@/lib/payroll-engine/setup";
import { AddRecordModal, EditRecordModal } from "@/components/payroll/setup-modal";
import { DeleteButton } from "@/components/payroll/row-actions";
import { GradingSystemChooser } from "@/components/payroll/grading-system-chooser";
import {
  addGrade,
  updateGradeAction,
  deleteGradeAction,
} from "@/app/(workspace)/payroll/setup/actions";

export const metadata = { title: "Pay Grades · Setup · Payroll" };
export const dynamic = "force-dynamic";

const num = (n: number) =>
  n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PayGradesPage() {
  const [grades, systems] = await Promise.all([
    listPayGrades(),
    listGradingSystems(),
  ]);
  const systemOptions = systems.map((s) => ({
    name: s.system_name,
    region: s.region ?? null,
    common_users: s.common_users ?? null,
  }));
  const empty = grades.length === 0;

  // One-system-per-tenant rule: after any Load-from-system action we
  // wipe and re-seed, so at rest the table holds a single grading
  // system (or legacy rows with no system tag). Pick whichever tag
  // has the most rows as the active one.
  const systemCounts = new Map<string, number>();
  let ungraded = 0;
  for (const g of grades) {
    if (g.grading_system) {
      systemCounts.set(g.grading_system, (systemCounts.get(g.grading_system) ?? 0) + 1);
    } else {
      ungraded += 1;
    }
  }
  const activeSystem = systemCounts.size > 0
    ? [...systemCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const gradeFields = [
    { name: "code", label: "Code", placeholder: "C3" },
    { name: "name", label: "Name", placeholder: "Officer" },
    { name: "salaryUsd", label: "Salary (USD)", type: "number" as const, defaultValue: 0 },
    { name: "salaryZig", label: "Salary (ZiG)", type: "number" as const, defaultValue: 0 },
    // NEC status is per-grade so an admin can move a single grade in
    // or out of NEC without reloading the whole system. Grading
    // system is set at seed time from the chooser above; it isn't
    // per-grade metadata worth re-editing here.
    {
      name: "isNecGrade",
      label: "NEC status",
      type: "select" as const,
      options: ["Inside NEC", "Above NEC"],
      defaultValue: "Inside NEC",
    },
    { name: "description", label: "Description" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            One fixed salary per grade. Assigning a grade pre-fills an
            employee&apos;s basic pay.
          </p>
          {(activeSystem || ungraded > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                Currently using:
              </span>
              {activeSystem && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                  {activeSystem}
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold">
                    {systemCounts.get(activeSystem)}
                  </span>
                </span>
              )}
              {ungraded > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 font-semibold text-muted-foreground">
                  Unassigned
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                    {ungraded}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
        {!empty && (
          <div className="flex items-center gap-4">
            <GradingSystemChooser
              systems={systemOptions}
              variant="inline"
              currentSystem={activeSystem}
              existingGradeCount={grades.length}
            />
            <AddRecordModal
              title="Add pay grade"
              buttonLabel="+ Add grade"
              action={addGrade}
              fields={gradeFields}
            />
          </div>
        )}
      </header>

      {empty ? (
        <GradingSystemChooser systems={systemOptions} variant="hero" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">Code</TableHead>
                <TableHead className="px-5">Name</TableHead>
                <TableHead className="px-5">NEC</TableHead>
                <TableHead className="px-5 text-right">Salary USD</TableHead>
                <TableHead className="px-5 text-right">Salary ZiG</TableHead>
                <TableHead className="px-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((g) => (
                <TableRow key={g.name}>
                  <TableCell className="px-5 align-middle font-mono font-semibold">
                    {g.code}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    {g.grade_name ?? "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    {g.is_nec_grade ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Inside NEC
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Above NEC
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right">
                    {g.salary_usd ? num(g.salary_usd) : "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right">
                    {g.salary_zig ? num(g.salary_zig) : "—"}
                  </TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      <EditRecordModal
                        id={g.name}
                        title="Edit pay grade"
                        action={updateGradeAction}
                        fields={[
                          { name: "code", label: "Code", defaultValue: g.code },
                          { name: "name", label: "Name", defaultValue: g.grade_name ?? "" },
                          {
                            name: "salaryUsd",
                            label: "Salary (USD)",
                            type: "number" as const,
                            defaultValue: g.salary_usd ?? 0,
                          },
                          {
                            name: "salaryZig",
                            label: "Salary (ZiG)",
                            type: "number" as const,
                            defaultValue: g.salary_zig ?? 0,
                          },
                          {
                            name: "isNecGrade",
                            label: "NEC status",
                            type: "select" as const,
                            options: ["Inside NEC", "Above NEC"],
                            defaultValue: g.is_nec_grade ? "Inside NEC" : "Above NEC",
                          },
                          {
                            name: "description",
                            label: "Description",
                            defaultValue: g.description ?? "",
                          },
                        ]}
                      />
                      <DeleteButton
                        id={g.name}
                        confirmText={`Delete ${g.code}?`}
                        action={deleteGradeAction}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

import { listPayrollEmployees } from "@/lib/payroll-engine/doctype-helpers";
import { PeopleTable } from "@/components/payroll/people-table";

export const metadata = { title: "People · Payroll · Colossal HR" };

export default async function PeopleTab() {
  const people = await listPayrollEmployees();
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-foreground">People</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {people.length} people on payroll
        </p>
      </header>
      <PeopleTable
        people={people.map((p) => ({
          id: p.name,
          name: p.employeeName,
          title: p.designation ?? "—",
          department: p.department ?? "—",
          payType: p.payType,
          comp: p.annualSalary,
          payCurrency: p.payCurrency,
          state: "—",
          missing: p.missingFields.length,
        }))}
      />
    </div>
  );
}

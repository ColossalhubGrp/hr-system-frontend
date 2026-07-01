import { SetupTabs } from "@/components/payroll/setup-tabs";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Setup
        </p>
        <h1 className="text-[28px] font-bold leading-tight text-foreground">
          Payroll master data
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lookup tables the Employees, Transactions and Pay Runs forms
          pick from. Edits here flow into the next pay run automatically.
        </p>
      </header>
      <SetupTabs />
      {children}
    </div>
  );
}

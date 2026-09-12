import Link from "next/link";
import type { Route } from "next";
import {
  Settings,
  Users as UsersIcon,
  ShieldCheck,
  Building2,
  Building,
  Lock,
  CalendarDays,
  MapPin,
  ChevronRight,
  Database,
} from "lucide-react";
import { getMyAccess } from "@/lib/frappe/roles";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata = { title: "Configuration · Colossal HR" };

type SettingCardSpec = {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  /** Which access flag this card requires. Cards the user can't actually
   *  visit are NOT shown — locked-card variants aren't surfaced either, so
   *  the UI stays honest about what each persona can do. */
  show: (a: Awaited<ReturnType<typeof getMyAccess>>) => boolean;
};

const COMPANY_CARDS: SettingCardSpec[] = [
  {
    href: "/settings/company",
    icon: <Building2 className="h-4 w-4" />,
    title: "Company profile",
    desc: "Legal name, address, currency, default holiday calendar — the values that the rest of HR + Payroll inherit.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/branches",
    icon: <MapPin className="h-4 w-4" />,
    title: "Branches",
    desc: "Business locations employees can be assigned to (name + optional weekly labour budget). Assigned per Employee on the Overview tab.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/departments",
    icon: <Building className="h-4 w-4" />,
    title: "Departments",
    desc: "Manage the department tree and set the fallback approvers (leave, expense, shift) that Employee approver fields inherit when left blank.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/holiday-lists",
    icon: <CalendarDays className="h-4 w-4" />,
    title: "Holiday lists",
    desc: "Create tenant calendars (name + date range + weekly off). Assign one as a Company or Employee default so leave, attendance and payroll pick it up.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/holiday-lists/assign",
    icon: <CalendarDays className="h-4 w-4" />,
    title: "Bulk-assign a holiday list",
    desc: "Set the same holiday list on every employee that matches a company/branch/department/employment-type/grade filter. Skips employees whose Status is Left.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/admin/references",
    icon: <Database className="h-4 w-4" />,
    title: "Reference data",
    desc: "Master lists that feed dropdowns across the workspace — training modes, competency categories, payroll tax rules and anything else promoted to a shared list.",
    show: (a) => a.isHrAdmin,
  },
];

// Module-specific settings moved to each module's own Setup page:
//   Leaves settings         → /hr/leaves/setup
//   Attendance settings     → /hr/attendance/setup
//   Performance settings    → /hr/performance/setup
//   Employee master setup   → /employee/setup
//   Payroll setup           → /payroll/setup
// Only cross-module cards (company, branches, departments, holiday lists,
// reference data, users, permissions) live here.

const IT_CARDS: SettingCardSpec[] = [
  {
    href: "/settings/users",
    icon: <UsersIcon className="h-4 w-4" />,
    title: "Users & Roles",
    desc: "Provision accounts, assign role bundles per the SRS persona list.",
    show: (a) => a.isItAdmin,
  },
  {
    href: "/settings/permissions",
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Permissions",
    desc: "Per-role DocPerm matrix — what each role can read, write, submit.",
    show: (a) => a.isItAdmin,
  },
];

export default async function SettingsHome() {
  const access = await getMyAccess();

  // Per the security model: filter cards BEFORE rendering. If a user can't
  // use a card, it doesn't appear — no greyed-out variants.
  const company = COMPANY_CARDS.filter((c) => c.show(access));
  const it = IT_CARDS.filter((c) => c.show(access));

  const totalVisible = company.length + it.length;

  const tabs: Array<{ id: string; label: string; subtitle: string; rows: SettingCardSpec[] }> = [];
  if (company.length > 0) {
    tabs.push({
      id: "company",
      label: "Company-wide",
      subtitle: "Applies to the entire org",
      rows: company,
    });
  }
  if (it.length > 0) {
    tabs.push({
      id: "it",
      label: "IT administration",
      subtitle: "Account, role and permission management",
      rows: it,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Settings className="h-3.5 w-3.5" />
          Configuration
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Cross-module configuration only — organisation, users and
          permissions. Module-specific settings live on each module&apos;s own
          Setup page (Leaves, Attendance, Performance, Employee, Payroll).
        </p>
      </header>

      {totalVisible === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
          <Lock className="mx-auto mb-2 h-4 w-4" />
          Your roles don&apos;t currently include any settings administration.
          Ask an HR Director or IT Admin to grant the right role bundle.
        </p>
      ) : (
        <Tabs defaultValue={tabs[0]?.id} className="flex flex-col gap-3">
          <TabsList className="w-fit">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id} className="m-0">
              <SettingsTable subtitle={t.subtitle} rows={t.rows} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function SettingsTable({
  subtitle,
  rows,
}: {
  subtitle: string;
  rows: SettingCardSpec[];
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <p className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.href} className="group">
                <TableCell className="align-top font-medium">
                  <Link
                    href={r.href as Route}
                    className="flex items-center gap-2 text-foreground hover:underline"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      {r.icon}
                    </span>
                    {r.title}
                  </Link>
                </TableCell>
                <TableCell className="align-top text-muted-foreground">
                  <Link href={r.href as Route} className="block">
                    {r.desc}
                  </Link>
                </TableCell>
                <TableCell className="text-right align-top">
                  <Link
                    href={r.href as Route}
                    className="inline-flex text-muted-foreground group-hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

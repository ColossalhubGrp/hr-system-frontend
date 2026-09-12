import Link from "next/link";
import type { Route } from "next";
import {
  Settings,
  Users as UsersIcon,
  ShieldCheck,
  Building2,
  Building,
  Target,
  Clock,
  Lock,
  CalendarCheck,
  CalendarDays,
  MapPin,
  MessageSquareWarning,
  Plane,
  ChevronRight,
  RefreshCcw,
  BadgeCheck,
  CalendarRange,
  CalendarX,
  Database,
  Fingerprint,
  Star,
  ClipboardList,
  Wallet,
  Receipt,
  Banknote,
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

const HR_CARDS: SettingCardSpec[] = [
  {
    href: "/settings/grievance-types",
    icon: <MessageSquareWarning className="h-4 w-4" />,
    title: "Grievance types",
    desc: "Categories HR can classify a filed grievance under. Feeds the type dropdown on the grievance form.",
    show: (a) => a.isHrAdmin || a.isHrAny,
  },
  {
    href: "/settings/performance",
    icon: <Target className="h-4 w-4" />,
    title: "Performance management",
    desc: "Default evaluation framework (KRA & Goals / OKR / Balanced Scorecard) — new cycles inherit it; HR can still override per cycle.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/overtime",
    icon: <Clock className="h-4 w-4" />,
    title: "Overtime rules",
    desc: "Define and assign overtime thresholds, calculation methods and effective dates — cascading from company → department → employee.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/feedback-criteria",
    icon: <Star className="h-4 w-4" />,
    title: "Feedback criteria",
    desc: "Reusable criteria HR picks when scoring appraisal feedback (Communication, Ownership, Technical delivery…). Set them here, feedback forms use them everywhere.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/designations",
    icon: <BadgeCheck className="h-4 w-4" />,
    title: "Designations",
    desc: "Job titles employees hold + the skills each role requires. Feeds appraisal skill-maps and interview scoring.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/leave-types",
    icon: <Plane className="h-4 w-4" />,
    title: "Leave types",
    desc: "Sick, casual, comp-off, encashable — with the fine-grained flags (earned / carry-forward / LWP / partially-paid / encashment) each type needs.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/leave-policies",
    icon: <Plane className="h-4 w-4" />,
    title: "Leave policies",
    desc: "Reusable bundles of leave-type quotas HR can assign to many employees in one action.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/leave-periods",
    icon: <CalendarRange className="h-4 w-4" />,
    title: "Leave periods",
    desc: "Time windows leave policies + earned-leave accrual are anchored to (typically the fiscal year).",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/leave-block-lists",
    icon: <CalendarX className="h-4 w-4" />,
    title: "Leave block lists",
    desc: "Dates on which leave applications are refused unless the applier's approver is on the bypass list — year-end close, product launches, exam periods.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/appraisal-templates",
    icon: <ClipboardList className="h-4 w-4" />,
    title: "Appraisal templates",
    desc: "Rating criteria + weightages a cycle uses to open appraisals. Set once — every new appraisal and its feedback forms inherit them.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/boarding-templates",
    icon: <ClipboardList className="h-4 w-4" />,
    title: "Onboarding + separation templates",
    desc: "Reusable activity checklists. Pick a template when opening an onboarding or separation record and the tasks auto-fill.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/attendance",
    icon: <CalendarCheck className="h-4 w-4" />,
    title: "Attendance & shifts",
    desc: "Org-wide switches for geolocation tracking on check-ins and whether the same employee can hold overlapping Shift Assignments.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/biometric",
    icon: <Fingerprint className="h-4 w-4" />,
    title: "Biometric devices",
    desc: "How to wire on-site fingerprint / face / RFID readers so punches flow into Attendance automatically. Step-by-step setup + API keys.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/hr/performance/cycles",
    icon: <RefreshCcw className="h-4 w-4" />,
    title: "Appraisal cycles",
    desc: "Create and manage cycles (dates, framework, goals, template). New appraisals inherit their criteria from the cycle's template.",
    show: (a) => a.isHrAdmin,
  },
];

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
  const hr = HR_CARDS.filter((c) => c.show(access));
  const it = IT_CARDS.filter((c) => c.show(access));

  const totalVisible = company.length + hr.length + it.length;

  const tabs: Array<{ id: string; label: string; subtitle: string; rows: SettingCardSpec[] }> = [];
  if (company.length > 0) {
    tabs.push({
      id: "company",
      label: "Company-wide",
      subtitle: "Applies to the entire org",
      rows: company,
    });
  }
  if (hr.length > 0) {
    tabs.push({
      id: "hr",
      label: "HR policy",
      subtitle: "Performance, time-off, overtime — set by HR leadership",
      rows: hr,
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
          Configuration that shapes the rest of the workspace. Each section
          requires a different role bundle — you&apos;re only seeing the tabs
          your access lets you actually use.
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

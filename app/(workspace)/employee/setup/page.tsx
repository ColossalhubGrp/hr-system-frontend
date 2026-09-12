import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  ChevronLeft,
  ClipboardList,
  MessageSquareWarning,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ModuleSetupGrid, type SetupCard } from "@/components/settings/module-setup-grid";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Employee setup · Colossal HR" };

const CARDS: SetupCard[] = [
  {
    href: "/settings/designations",
    icon: <BadgeCheck className="h-4 w-4" />,
    title: "Designations",
    desc: "Job titles employees hold + the skills each role requires. Feeds appraisal skill maps and interview scoring.",
  },
  {
    href: "/settings/grievance-types",
    icon: <MessageSquareWarning className="h-4 w-4" />,
    title: "Grievance types",
    desc: "Categories HR can classify a filed grievance under. Feeds the type dropdown on the grievance form.",
  },
  {
    href: "/settings/boarding-templates",
    icon: <ClipboardList className="h-4 w-4" />,
    title: "Onboarding + separation templates",
    desc: "Reusable activity checklists. Pick a template when opening an onboarding or separation record and the tasks auto-fill.",
  },
];

export default async function EmployeeSetupPage() {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    redirect("/forbidden?need=HR_ADMIN&from=" + encodeURIComponent("/employee/setup"));
  }
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/employee" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to employees
      </Link>
      <PageHeader
        icon={Settings2}
        crumb="Employee · Setup"
        title="Employee setup"
        subtitle="Master data for the employee module — designations (with required skills), grievance categories, and onboarding + separation activity templates."
      />
      <ModuleSetupGrid cards={CARDS} />
    </div>
  );
}

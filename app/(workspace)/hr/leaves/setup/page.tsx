import Link from "next/link";
import type { Route } from "next";
import {
  CalendarRange,
  CalendarX,
  ChevronLeft,
  Plane,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ModuleSetupGrid, type SetupCard } from "@/components/settings/module-setup-grid";
import { getMyAccess } from "@/lib/frappe/roles";
import { redirect } from "next/navigation";

export const metadata = { title: "Leaves setup · Colossal HR" };

const CARDS: SetupCard[] = [
  {
    href: "/settings/leave-types",
    icon: <Plane className="h-4 w-4" />,
    title: "Leave types",
    desc: "Sick, casual, comp-off, encashable — with earned / carry-forward / LWP / partially-paid / encashment flags each type needs.",
  },
  {
    href: "/settings/leave-policies",
    icon: <Plane className="h-4 w-4" />,
    title: "Leave policies",
    desc: "Reusable bundles of leave-type quotas HR can assign to many employees in one action.",
  },
  {
    href: "/settings/leave-periods",
    icon: <CalendarRange className="h-4 w-4" />,
    title: "Leave periods",
    desc: "Time windows leave policies + earned-leave accrual are anchored to (typically the fiscal year).",
  },
  {
    href: "/settings/leave-block-lists",
    icon: <CalendarX className="h-4 w-4" />,
    title: "Leave block lists",
    desc: "Dates on which leave applications are refused unless the applier's approver is on the bypass list.",
  },
];

export default async function LeavesSetupPage() {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    redirect("/forbidden?need=HR_ADMIN&from=" + encodeURIComponent("/hr/leaves/setup"));
  }
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/leaves" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to leaves
      </Link>
      <PageHeader
        icon={Settings2}
        crumb="HR · Leaves · Setup"
        title="Leaves setup"
        subtitle="Master data for the leaves module — types, policies, periods and block lists. Edits here flow into new leave applications immediately."
      />
      <ModuleSetupGrid cards={CARDS} />
    </div>
  );
}

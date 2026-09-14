import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, GraduationCap, Settings2, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ModuleSetupGrid, type SetupCard } from "@/components/settings/module-setup-grid";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Training setup · Colossal HR" };

const CARDS: SetupCard[] = [
  {
    href: "/settings/training-suppliers",
    icon: <Users className="h-4 w-4" />,
    title: "Training suppliers",
    desc: "Lightweight registry of external training providers — used by Training Programs and Events without pulling in the ERPNext Buying module.",
  },
];

export default async function TrainingSetupPage() {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" + encodeURIComponent("/hr/training/setup"),
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/training" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to training
      </Link>
      <PageHeader
        icon={Settings2}
        crumb="HR · Training · Setup"
        title="Training setup"
        subtitle="Master data for the training module — currently the training-supplier registry that Programs and Events pick from."
      />
      <ModuleSetupGrid cards={CARDS} fromPath="/hr/training/setup" />
    </div>
  );
}

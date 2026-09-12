import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listSkillsPool } from "@/lib/frappe/setup-designations";
import { DesignationEditor } from "@/components/setup/designation-editor";
import { upsertDesignationAction } from "../actions";

export const metadata = {
  title: "New designation · Designations · Colossal HR",
};

export default async function NewDesignationPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/designations/new"),
    );
  }
  const skillsPool = await listSkillsPool();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings/designations" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to designations
      </Link>

      <PageHeader
        icon={BadgeCheck}
        crumb="Configuration · HR policy · Designations · New"
        title="New designation"
        subtitle="Give it a name and the skills anyone in this role should have."
      />

      <DesignationEditor
        mode="new"
        action={upsertDesignationAction}
        skillsPool={skillsPool}
      />
    </div>
  );
}

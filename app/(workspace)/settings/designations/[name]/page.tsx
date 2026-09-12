import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  getDesignation,
  listSkillsPool,
} from "@/lib/frappe/setup-designations";
import { DesignationEditor } from "@/components/setup/designation-editor";
import { upsertDesignationAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  return { title: `${name} · Designations · Colossal HR` };
}

export default async function EditDesignationPage({
  params,
}: {
  params: { name: string };
}) {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent(`/settings/designations/${params.name}`),
    );
  }
  const name = decodeURIComponent(params.name);
  const [designation, skillsPool] = await Promise.all([
    getDesignation(name),
    listSkillsPool(),
  ]);
  if (!designation) notFound();

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
        crumb={`Configuration · HR policy · Designations · ${designation.name}`}
        title={designation.name}
        subtitle="Edit description + required skills. Employees keep their assignment; new hires + skill-maps pick up the change immediately."
      />

      <DesignationEditor
        mode="edit"
        action={upsertDesignationAction}
        initial={{
          name: designation.name,
          description: designation.description,
          skills: designation.skills,
        }}
        skillsPool={skillsPool}
      />
    </div>
  );
}

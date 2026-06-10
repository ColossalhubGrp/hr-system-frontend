import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import {
  GrievanceForm,
  OnboardingForm,
  PromotionForm,
  SeparationForm,
  TransferForm,
} from "@/components/lifecycle/forms";
import { LIFECYCLE_META, type LifecycleKind } from "@/lib/frappe/lifecycle";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import {
  createGrievanceAction,
  createOnboardingAction,
  createPromotionAction,
  createSeparationAction,
  createTransferAction,
} from "../../actions";

const KINDS: LifecycleKind[] = [
  "onboarding",
  "separation",
  "transfer",
  "promotion",
  "grievance",
];

function isKind(v: unknown): v is LifecycleKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}

export async function generateMetadata({
  params,
}: {
  params: { kind: string };
}) {
  if (!isKind(params.kind)) return { title: "New lifecycle record" };
  return { title: `New ${LIFECYCLE_META[params.kind].label} · Colossal HR` };
}

export default async function NewLifecyclePage({
  params,
  searchParams,
}: {
  params: { kind: string };
  searchParams: { employee?: string };
}) {
  if (!isKind(params.kind)) notFound();
  const kind = params.kind;
  const meta = LIFECYCLE_META[kind];
  const opts = await fetchEmployeeFormOptions();
  const back = `/employee/lifecycle/${kind}` as Route;
  const cancelHref = `/employee/lifecycle/${kind}`;
  // Both forms and actions share the same `Opts` shape — keep one prefill
  // pipeline regardless of kind.
  const formOpts = {
    companies: opts.companies,
    departments: opts.departments,
    designations: opts.designations,
    grades: opts.grades,
    defaultEmployee: searchParams.employee,
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={back}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {meta.label.toLowerCase()}
      </Link>

      <PageHeader
        icon={GitBranch}
        crumb={`Employee · Lifecycle · New ${meta.label.toLowerCase()}`}
        title={`File a ${meta.label.toLowerCase()}`}
      />

      {kind === "onboarding" && (
        <OnboardingForm action={createOnboardingAction} opts={formOpts} cancelHref={cancelHref} />
      )}
      {kind === "separation" && (
        <SeparationForm action={createSeparationAction} opts={formOpts} cancelHref={cancelHref} />
      )}
      {kind === "transfer" && (
        <TransferForm action={createTransferAction} opts={formOpts} cancelHref={cancelHref} />
      )}
      {kind === "promotion" && (
        <PromotionForm action={createPromotionAction} opts={formOpts} cancelHref={cancelHref} />
      )}
      {kind === "grievance" && (
        <GrievanceForm action={createGrievanceAction} opts={formOpts} cancelHref={cancelHref} />
      )}
    </div>
  );
}

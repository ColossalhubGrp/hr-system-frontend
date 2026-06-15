import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Compass, Layers3, Target } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  EVALUATION_FRAMEWORKS,
  getCycleFramework,
  type EvaluationFramework,
} from "@/lib/frappe/appraisal-framework";
import { frappeCall } from "@/lib/frappe/client";
import { setCycleFrameworkAction } from "../../../actions";
import { FrameworkCards } from "@/components/performance/framework-cards";

export const metadata = { title: "Edit framework · Colossal HR" };

async function getCycleDoc(id: string) {
  try {
    type Raw = {
      name: string;
      cycle_name: string | null;
      company: string | null;
      start_date: string | null;
      end_date: string | null;
    };
    return await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Appraisal Cycle", name: id },
      as: "user",
    });
  } catch {
    return null;
  }
}

export default async function EditFrameworkPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [doc, framework, access] = await Promise.all([
    getCycleDoc(id),
    getCycleFramework(id),
    getMyAccess(),
  ]);
  if (!doc) notFound();

  // Hard guard: only HR Admin can write evaluation_framework.
  if (!access.isHrAdmin) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-lg font-semibold text-ink-900">Forbidden</h1>
        <p className="mt-2 text-sm text-ash-700">
          Only HR Manager and System Manager roles can change the evaluation
          framework on an appraisal cycle.
        </p>
        <Link
          href={"/hr/performance" as Route}
          className="mt-5 inline-flex h-9 items-center gap-1 rounded-chip border border-hairline bg-surface px-3 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
        >
          Back to Performance
        </Link>
      </div>
    );
  }

  const back = `/hr/performance/cycles/${encodeURIComponent(id)}` as Route;
  const action = setCycleFrameworkAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={back}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to cycle
      </Link>

      <PageHeader
        icon={Target}
        crumb={`HR · Performance · ${doc.cycle_name ?? id} · Framework`}
        title="Evaluation framework"
        subtitle="Pick the system the cycle's scoring engine should use. Affects everyone in scope of this cycle."
      />

      <FrameworkCards
        action={action}
        current={framework}
        options={EVALUATION_FRAMEWORKS}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { TrainingSuppliersAdmin } from "@/components/settings/training-suppliers-admin";
import { listTrainingSuppliers } from "@/lib/frappe/training-suppliers";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Training suppliers · Settings · Colossal HR" };

export default async function TrainingSuppliersPage() {
  const access = await getMyAccess();
  if (!(access.isHrAdmin || access.isItAdmin || access.isHrAny)) {
    redirect(
      "/forbidden?need=HR_ANY&from=" +
        encodeURIComponent("/settings/training-suppliers"),
    );
  }
  const rows = await listTrainingSuppliers();
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);
  return (
    <div className="flex flex-col gap-5">
      <SettingsBackLink />
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" />
          Settings · Training suppliers
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Training suppliers
        </h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} supplier{rows.length === 1 ? "" : "s"} on file. Used by
          Training Programs and Training Events to attribute an external
          provider without needing the ERPNext Buying module.
        </p>
      </header>
      <Card>
        <CardContent className="p-0">
          <TrainingSuppliersAdmin initial={rows} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}

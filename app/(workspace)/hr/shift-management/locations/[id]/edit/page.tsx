import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { ShiftLocationForm } from "@/components/shifts/shift-location-form";
import { listCompanies } from "@/lib/frappe/lookups";
import { getShiftLocation } from "@/lib/frappe/shift-locations";
import { updateShiftLocationAction } from "../../../actions";

export const metadata = { title: "Edit shift location · Colossal HR" };

export default async function EditShiftLocationPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [loc, companies] = await Promise.all([
    getShiftLocation(id),
    listCompanies(),
  ]);
  if (!loc) notFound();

  const action = updateShiftLocationAction.bind(null, id);
  const backHref = `/hr/shift-management/locations/${encodeURIComponent(id)}` as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {loc.locationName}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <MapPin className="h-3.5 w-3.5" />
          HR · Shift Management · Edit location
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit {loc.locationName}
        </h1>
      </header>

      <ShiftLocationForm
        mode="edit"
        action={action}
        companies={companies}
        cancelHref={backHref}
        initial={{
          name: loc.id,
          locationName: loc.locationName,
          company: loc.company,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusMeters: loc.radiusMeters,
          address: loc.address,
          isActive: loc.isActive,
        }}
      />
    </div>
  );
}

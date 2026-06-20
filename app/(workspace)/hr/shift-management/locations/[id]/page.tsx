import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Pencil } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DeleteConfirm } from "@/components/common/delete-confirm";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getShiftLocation } from "@/lib/frappe/shift-locations";
import { deleteShiftLocationAction } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const l = await getShiftLocation(decodeURIComponent(params.id));
  return {
    title: l ? `${l.id} · Shift location · Colossal HR` : "Shift location",
  };
}

export default async function ShiftLocationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const loc = await getShiftLocation(id);
  if (!loc) notFound();

  const editHref =
    `/hr/shift-management/locations/${encodeURIComponent(id)}/edit` as Route;
  const onDelete = deleteShiftLocationAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=locations" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to locations
      </Link>

      <PageHeader
        icon={MapPin}
        crumb={`HR · Shift Management · Location · ${loc.id}`}
        title={loc.locationName}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={loc.isActive ? "Active" : "Inactive"} />
            <span>
              · {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} · {loc.radiusMeters} m
            </span>
          </span>
        }
        actions={
          <Link
            href={editHref}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        }
      />

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Location
        </h2>
        <FieldGrid
          fields={[
            { label: "Name", value: loc.locationName },
            { label: "Company", value: loc.company },
            { label: "Latitude", value: loc.latitude.toString() },
            { label: "Longitude", value: loc.longitude.toString() },
            { label: "Geofence radius", value: `${loc.radiusMeters} m` },
            { label: "Active", value: loc.isActive ? "Yes" : "No" },
            { label: "Address", value: loc.address, wide: true },
          ]}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Open in maps
        </h2>
        <p className="text-sm text-ash-600">
          Quick links to verify the coordinates land where you expect.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=17/${loc.latitude}/${loc.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-medium text-ash-700 transition hover:bg-canvas focus-ring"
          >
            OpenStreetMap
          </a>
          <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-medium text-ash-700 transition hover:bg-canvas focus-ring"
          >
            Google Maps
          </a>
        </div>
      </section>

      <DeleteConfirm
        title={`Delete ${loc.id}`}
        description="The system will refuse if any shift type still lists this as an allowed location."
        action={onDelete}
      />
    </div>
  );
}

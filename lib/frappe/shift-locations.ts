import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

export type ShiftLocationRow = {
  id: string;
  locationName: string;
  company: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
};

export type ShiftLocationFull = ShiftLocationRow & {
  address: string | null;
};

export async function listShiftLocations(opts: {
  isActive?: "Yes" | "No";
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  rows: ShiftLocationRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string | number]> = [];
  if (opts.isActive === "Yes") filters.push(["is_active", "=", 1]);
  if (opts.isActive === "No") filters.push(["is_active", "=", 0]);

  type Raw = {
    name: string;
    location_name: string;
    company: string | null;
    latitude: number | null;
    longitude: number | null;
    radius_meters: number | null;
    is_active: 0 | 1 | boolean | null;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Shift Location",
        fields: [
          "name",
          "location_name",
          "company",
          "latitude",
          "longitude",
          "radius_meters",
          "is_active",
        ],
        filters: JSON.stringify(filters),
        order_by: "location_name asc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Raw[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Shift Location", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      locationName: r.location_name,
      company: r.company,
      latitude: Number(r.latitude ?? 0),
      longitude: Number(r.longitude ?? 0),
      radiusMeters: Number(r.radius_meters ?? 0),
      isActive: Boolean(r.is_active),
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

export async function getShiftLocation(
  id: string,
): Promise<ShiftLocationFull | null> {
  try {
    type Raw = {
      name: string;
      location_name: string;
      company: string | null;
      latitude: number | null;
      longitude: number | null;
      radius_meters: number | null;
      is_active: 0 | 1 | boolean | null;
      address: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Shift Location", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      locationName: doc.location_name,
      company: doc.company,
      latitude: Number(doc.latitude ?? 0),
      longitude: Number(doc.longitude ?? 0),
      radiusMeters: Number(doc.radius_meters ?? 0),
      isActive: Boolean(doc.is_active),
      address: doc.address,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type ShiftLocationInput = {
  location_name: string;
  latitude: number;
  longitude: number;
  radius_meters?: number;
  address?: string;
  company?: string;
  is_active?: boolean;
};

function compact<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

export async function createShiftLocation(
  input: ShiftLocationInput,
): Promise<string> {
  const doc = {
    doctype: "Shift Location",
    ...compact({
      ...input,
      is_active: input.is_active === undefined ? 1 : input.is_active ? 1 : 0,
    }),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

export async function updateShiftLocation(
  id: string,
  input: Partial<ShiftLocationInput>,
): Promise<void> {
  const payload = compact({
    location_name: input.location_name,
    latitude: input.latitude,
    longitude: input.longitude,
    radius_meters: input.radius_meters,
    address: input.address,
    company: input.company,
    is_active:
      input.is_active === undefined ? undefined : input.is_active ? 1 : 0,
  });
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: { doctype: "Shift Location", name: id, fieldname: payload },
    verb: "POST",
    as: "user",
  });
}

export async function deleteShiftLocation(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    args: { doctype: "Shift Location", name: id },
    verb: "POST",
    as: "user",
  });
}

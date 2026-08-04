import "server-only";
import { frappeCall } from "./client";

export type HolidayListRow = {
  id: string;
  name: string;
  fromDate: string | null;
  toDate: string | null;
  totalHolidays: number;
  weeklyOff: string | null;
  color: string | null;
};

export type HolidayListInput = {
  holiday_list_name: string;
  from_date: string;
  to_date: string;
  weekly_off?: string;
  color?: string;
};

export async function listHolidayLists(): Promise<HolidayListRow[]> {
  type Row = {
    name: string;
    holiday_list_name: string | null;
    from_date: string | null;
    to_date: string | null;
    total_holidays: number | null;
    weekly_off: string | null;
    color: string | null;
  };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Holiday List",
      fields: [
        "name",
        "holiday_list_name",
        "from_date",
        "to_date",
        "total_holidays",
        "weekly_off",
        "color",
      ],
      order_by: "from_date desc",
      limit_page_length: 200,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({
    id: r.name,
    name: r.holiday_list_name ?? r.name,
    fromDate: r.from_date,
    toDate: r.to_date,
    totalHolidays: Number(r.total_holidays ?? 0),
    weeklyOff: r.weekly_off,
    color: r.color,
  }));
}

export async function createHolidayList(input: HolidayListInput): Promise<string> {
  const doc = {
    doctype: "Holiday List",
    holiday_list_name: input.holiday_list_name,
    from_date: input.from_date,
    to_date: input.to_date,
    ...(input.weekly_off ? { weekly_off: input.weekly_off } : {}),
    ...(input.color ? { color: input.color } : {}),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

/** Holiday List autoname is `field:holiday_list_name` — DocType.name is the
 *  human label. Rename via frappe.client.rename_doc when the label
 *  changes, then set_value on the other editable fields. */
export async function updateHolidayList(input: {
  originalName: string;
  holiday_list_name: string;
  from_date: string;
  to_date: string;
  weekly_off?: string;
}): Promise<string> {
  const finalName = input.holiday_list_name.trim();
  let currentName = input.originalName;
  if (finalName && finalName !== input.originalName) {
    await frappeCall<unknown>({
      method: "frappe.client.rename_doc",
      verb: "POST",
      args: {
        doctype: "Holiday List",
        old_name: input.originalName,
        new_name: finalName,
        merge: 0,
      },
      as: "user",
    });
    currentName = finalName;
  }
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "Holiday List",
      name: currentName,
      fieldname: {
        from_date: input.from_date,
        to_date: input.to_date,
        weekly_off: input.weekly_off ?? "",
      },
    },
    as: "user",
  });
  return currentName;
}

export async function deleteHolidayList(name: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "Holiday List", name },
    as: "user",
  });
}

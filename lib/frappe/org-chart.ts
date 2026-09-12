import "server-only";
import { frappeCall } from "./client";

export type OrgEmployee = {
  id: string;
  employeeName: string;
  designation: string | null;
  department: string | null;
  image: string | null;
  reportsTo: string | null;
  status: string;
};

/** All active employees + their reporting links. Used to build the org
 *  tree client-side — one round trip to Frappe, tree assembled from the
 *  `reports_to` edges. Company filter kept optional so a multi-tenant
 *  view can be added later without another endpoint. */
export async function listOrgEmployees(opts?: {
  company?: string;
}): Promise<OrgEmployee[]> {
  const filters: Array<[string, string, string]> = [
    ["status", "!=", "Left"],
  ];
  if (opts?.company) filters.push(["company", "=", opts.company]);

  try {
    type Row = {
      name: string;
      employee_name: string | null;
      designation: string | null;
      department: string | null;
      image: string | null;
      reports_to: string | null;
      status: string | null;
    };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: [
          "name",
          "employee_name",
          "designation",
          "department",
          "image",
          "reports_to",
          "status",
        ],
        filters: JSON.stringify(filters),
        order_by: "employee_name asc",
        limit_page_length: 0,
      },
      as: "user",
    });
    return rows.map((r) => ({
      id: r.name,
      employeeName: r.employee_name ?? r.name,
      designation: r.designation,
      department: r.department,
      image: r.image,
      reportsTo: r.reports_to,
      status: r.status ?? "Active",
    }));
  } catch {
    return [];
  }
}

import "server-only";
import { frappeCall, FrappeRequestError } from "./client";

export type DesignationSummary = {
  name: string;
  description: string | null;
  skillsCount: number;
  employeeCount: number;
};

export type DesignationFull = {
  name: string;
  description: string | null;
  skills: string[];
};

/** All designations with their skill counts + how many employees hold them.
 *  Child-table counts come off the parent doc (HR admins don't hold
 *  read-perm on the child DocType directly — same pattern the appraisal
 *  templates list uses). */
export async function listDesignations(): Promise<DesignationSummary[]> {
  try {
    type Row = { name: string; description: string | null };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Designation",
        fields: ["name", "description"],
        order_by: "name asc",
        limit_page_length: 500,
      },
      as: "user",
    });

    const names = rows.map((r) => r.name);
    type ChildRead = { skills?: Array<{ skill?: string | null }> | null };
    const [fulls, employeeRows] = await Promise.all([
      Promise.all(
        names.map((name) =>
          frappeCall<ChildRead>({
            method: "frappe.client.get",
            args: { doctype: "Designation", name },
            as: "user",
          }).catch(() => ({}) as ChildRead),
        ),
      ),
      names.length
        ? frappeCall<Array<{ designation: string }>>({
            method: "frappe.client.get_list",
            args: {
              doctype: "Employee",
              fields: ["designation"],
              filters: JSON.stringify([["designation", "in", names]]),
              limit_page_length: 0,
            },
            as: "user",
          }).catch(() => [])
        : [],
    ]);

    const empCount: Record<string, number> = {};
    for (const r of employeeRows)
      empCount[r.designation] = (empCount[r.designation] ?? 0) + 1;

    return rows.map((r, i) => ({
      name: r.name,
      description: r.description,
      skillsCount: Array.isArray(fulls[i]?.skills) ? fulls[i]!.skills!.length : 0,
      employeeCount: empCount[r.name] ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getDesignation(name: string): Promise<DesignationFull | null> {
  try {
    type Raw = {
      name: string;
      description: string | null;
      skills?: Array<{ skill?: string | null }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Designation", name },
      as: "user",
    });
    return {
      name: doc.name,
      description: doc.description,
      skills: (doc.skills ?? [])
        .map((r) => (r.skill ?? "").trim())
        .filter(Boolean),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

/** Every existing Skill — feeds the "New skill" datalist so HR picks from
 *  the shared pool instead of retyping. Unknowns are auto-created on save. */
export async function listSkillsPool(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Skill",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

export async function upsertDesignation(input: {
  name: string;
  description?: string;
  skills: string[];
}): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_upsert_designation",
    verb: "POST",
    args: {
      name: input.name,
      description: input.description ?? "",
      skills: JSON.stringify(input.skills.map((s) => ({ skill: s }))),
    },
    as: "user",
  });
}

export async function deleteDesignation(name: string): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_delete_designation",
    verb: "POST",
    args: { name },
    as: "user",
  });
}

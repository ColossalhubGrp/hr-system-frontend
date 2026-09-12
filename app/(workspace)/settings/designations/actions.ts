"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  deleteDesignation,
  upsertDesignation,
} from "@/lib/frappe/setup-designations";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

async function requireHrAdmin(): Promise<StdFormState | null> {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    return { error: "Only HR admins can edit designations." };
  }
  return null;
}

const upsertSchema = z.object({
  name: z.string().trim().min(1, "Give the designation a name."),
  description: z.string().trim().optional(),
});

/** Create OR update. `skills_json` is a JSON array of skill-name strings
 *  the client serialized before submit. Duplicates + blanks are dropped
 *  server-side. */
export async function upsertDesignationAction(
  _prev: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return blocked;

  const parsed = upsertSchema.safeParse({
    name: form.get("name"),
    description: form.get("description"),
  });
  if (!parsed.success) {
    const fieldErrors: StdFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key) fieldErrors[key] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  let skills: string[] = [];
  try {
    const raw = String(form.get("skills_json") ?? "[]");
    const parsedSkills = JSON.parse(raw);
    if (Array.isArray(parsedSkills)) {
      const seen = new Set<string>();
      for (const s of parsedSkills) {
        const clean = String(s ?? "").trim();
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        skills.push(clean);
      }
    }
  } catch {
    return { error: "Skills payload is corrupt." };
  }

  try {
    await upsertDesignation({
      name: parsed.data.name,
      description: parsed.data.description,
      skills,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/designations");
  revalidatePath(`/settings/designations/${encodeURIComponent(parsed.data.name)}`);
  redirect("/settings/designations");
}

export async function deleteDesignationAction(
  _prev: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return blocked;
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Missing designation name." };
  try {
    await deleteDesignation(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/designations");
  return {};
}

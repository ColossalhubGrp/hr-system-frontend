"use server";

import { revalidatePath } from "next/cache";
import { frappeCall } from "@/lib/frappe/client";
import { getMyAccess } from "@/lib/frappe/roles";

type Result =
  | { ok: true; roles: string[] }
  | { ok: false; error: string };

/**
 * Replace the role set on a user. The whitelisted Frappe method re-checks
 * admin rights server-side; this wrapper is the Server Action the drawer
 * posts to so the page revalidates after the write.
 */
export async function setUserRolesAction(
  userEmail: string,
  roles: string[],
): Promise<Result> {
  if (!userEmail) return { ok: false, error: "Missing user email." };

  const access = await getMyAccess();
  if (!access.isItAdmin && !access.isHrAdmin) {
    return {
      ok: false,
      error: "Only IT Admins and HR Directors can change role assignments.",
    };
  }

  try {
    type Resp = { ok: boolean; user: string; roles: string[] };
    const resp = await frappeCall<Resp>({
      method: "recruitment_app.api.me.set_user_roles",
      verb: "POST",
      args: { user_email: userEmail, roles: JSON.stringify(roles) },
      as: "user",
    });
    revalidatePath("/settings/users");
    return { ok: true, roles: resp.roles };
  } catch (err) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to update roles.";
    return { ok: false, error: msg };
  }
}

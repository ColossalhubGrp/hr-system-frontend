import "server-only";
import { frappeCall } from "./client";

/**
 * Shared submit helper for any whitelisted doctype.
 *
 * Frappe v15's `frappe.client.submit` rejects the lean
 * `{doctype, name}` payload with 417 EXPECTATION FAILED — the submit
 * handler validates every field on the posted doc and the stub is
 * missing them. The fix (used throughout Frappe's own frontends) is
 * to GET the full doc first, then pass the entire payload to submit.
 *
 * Both calls run as the signed-in user so Frappe applies submit perms
 * normally.
 */
export async function submitDoc(doctype: string, name: string): Promise<void> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype, name },
    as: "user",
  });
  await frappeCall({
    method: "frappe.client.submit",
    args: { doc },
    verb: "POST",
    as: "user",
  });
}

/** Mirror helper for cancel. Cancel accepts {doctype, name} directly
 *  in Frappe v15 (unlike submit), but routing through here keeps the
 *  call sites symmetric and gives us one place to add retries later. */
export async function cancelDoc(doctype: string, name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    args: { doctype, name },
    verb: "POST",
    as: "user",
  });
}

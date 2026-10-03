"use server";

import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { requireGroup } from "@/lib/frappe/require-role";
import { revalidatePath } from "next/cache";

export type NewAccountInput = {
  company: string;
  accountName: string;
  parentAccount: string;
  isGroup: boolean;
  accountType?: string | null;
  currency?: string | null;
  rootType?: "Asset" | "Liability" | "Equity" | "Income" | "Expense" | null;
};

export type UpdateAccountInput = Partial<{
  accountName: string;
  accountType: string | null;
  currency: string | null;
  disabled: boolean;
}>;

export type ActionResult =
  | { ok: true;  message: string; name?: string }
  | { ok: false; error: string };

function friendlyFrappe(err: unknown): string {
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as { _server_messages?: string } | undefined;
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0] ? (JSON.parse(arr[0]) as { message?: string }) : undefined;
        if (first?.message) return first.message.replace(/<[^>]+>/g, "").trim();
      } catch { /* fall through */ }
    }
    return err.message || "Operation failed.";
  }
  return (err as { message?: string })?.message ?? "Unknown error.";
}

export async function createAccountAction(input: NewAccountInput): Promise<ActionResult> {
  await requireGroup("HR_ADMIN");

  const name = (input.accountName ?? "").trim();
  if (!name) return { ok: false, error: "Account name is required." };
  if (!input.company) return { ok: false, error: "Company is required." };
  if (!input.parentAccount) return { ok: false, error: "Pick a parent account." };

  try {
    const doc = await frappeCall<{ name: string }>({
      method: "frappe.client.insert",
      verb: "POST",
      as: "user",
      args: {
        doc: {
          doctype: "Account",
          account_name: name,
          parent_account: input.parentAccount,
          company: input.company,
          is_group: input.isGroup ? 1 : 0,
          account_type: input.accountType || null,
          account_currency: input.currency || null,
          root_type: input.rootType || null,
        },
      },
    });
    revalidatePath("/accounting/chart-of-accounts");
    return { ok: true, message: `Added "${name}".`, name: doc?.name };
  } catch (err) {
    return { ok: false, error: friendlyFrappe(err) };
  }
}

export async function updateAccountAction(
  accountName: string,
  patch: UpdateAccountInput,
): Promise<ActionResult> {
  await requireGroup("HR_ADMIN");
  const dbPatch: Record<string, unknown> = {};
  if (patch.accountName !== undefined) dbPatch.account_name = patch.accountName.trim();
  if (patch.accountType !== undefined) dbPatch.account_type = patch.accountType || null;
  if (patch.currency !== undefined)    dbPatch.account_currency = patch.currency || null;
  if (patch.disabled !== undefined)    dbPatch.disabled = patch.disabled ? 1 : 0;

  if (Object.keys(dbPatch).length === 0) {
    return { ok: true, message: "Nothing to update." };
  }

  try {
    await frappeCall({
      method: "frappe.client.set_value",
      verb: "POST",
      as: "user",
      args: { doctype: "Account", name: accountName, fieldname: dbPatch },
    });
    revalidatePath("/accounting/chart-of-accounts");
    revalidatePath(`/accounting/chart-of-accounts/${encodeURIComponent(accountName)}`);
    return { ok: true, message: "Saved." };
  } catch (err) {
    return { ok: false, error: friendlyFrappe(err) };
  }
}

/**
 * Delete if the account has NEVER been posted to, otherwise disable
 * (freeze) instead so GL history stays intact. The accounting rule
 * discussed in chat — never orphan a ledger history.
 */
export async function smartDeleteAccountAction(
  accountName: string,
): Promise<ActionResult & { action?: "deleted" | "disabled" }> {
  await requireGroup("HR_ADMIN");

  // 1. Transaction check — any GL Entry references this account?
  let glCount = 0;
  try {
    glCount = Number(
      await frappeCall<number>({
        method: "frappe.client.get_count",
        as: "user",
        args: {
          doctype: "GL Entry",
          filters: JSON.stringify([["account", "=", accountName]]),
        },
      }) ?? 0,
    );
  } catch {
    // If the count query fails, err on the side of safety — disable.
    glCount = 1;
  }

  // 2. Check for child accounts — can't delete a parent either.
  let childCount = 0;
  try {
    childCount = Number(
      await frappeCall<number>({
        method: "frappe.client.get_count",
        as: "user",
        args: {
          doctype: "Account",
          filters: JSON.stringify([["parent_account", "=", accountName]]),
        },
      }) ?? 0,
    );
  } catch {
    childCount = 1;
  }

  // 3. Pure delete only when there's zero history AND no children.
  if (glCount === 0 && childCount === 0) {
    try {
      await frappeCall({
        method: "frappe.client.delete",
        verb: "POST",
        as: "user",
        args: { doctype: "Account", name: accountName },
      });
      revalidatePath("/accounting/chart-of-accounts");
      return { ok: true, action: "deleted", message: `Deleted "${accountName}".` };
    } catch (err) {
      return { ok: false, error: friendlyFrappe(err) };
    }
  }

  // 4. Fall through — disable instead.
  try {
    await frappeCall({
      method: "frappe.client.set_value",
      verb: "POST",
      as: "user",
      args: {
        doctype: "Account",
        name: accountName,
        fieldname: { disabled: 1 },
      },
    });
    revalidatePath("/accounting/chart-of-accounts");
    revalidatePath(`/accounting/chart-of-accounts/${encodeURIComponent(accountName)}`);
    const why = glCount > 0 && childCount > 0
      ? `has ${glCount} posting${glCount === 1 ? "" : "s"} and ${childCount} child account${childCount === 1 ? "" : "s"}`
      : glCount > 0
        ? `has ${glCount} posting${glCount === 1 ? "" : "s"}`
        : `has ${childCount} child account${childCount === 1 ? "" : "s"}`;
    return {
      ok: true,
      action: "disabled",
      message: `Disabled "${accountName}" — it ${why}, so history is preserved.`,
    };
  } catch (err) {
    return { ok: false, error: friendlyFrappe(err) };
  }
}

export async function setAccountDisabledAction(
  accountName: string,
  disabled: boolean,
): Promise<ActionResult> {
  return updateAccountAction(accountName, { disabled });
}

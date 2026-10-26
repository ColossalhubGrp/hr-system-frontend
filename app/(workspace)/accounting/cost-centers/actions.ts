"use server";

import { revalidatePath } from "next/cache";
import {
  createCostCenter,
  updateCostCenter,
  setCostCenterDisabled,
  smartDeleteCostCenter,
} from "@/lib/frappe/cost-centers";
import { FrappeRequestError } from "@/lib/frappe/client";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

function err(e: unknown): Err {
  if (e instanceof FrappeRequestError) {
    const real = extractFrappeMessage(e.detail);
    if (real) return { ok: false, error: real };
    const s = e.message.toLowerCase();
    if (s.includes("403") || s.includes("forbidden") || s.includes("permission")) {
      return { ok: false, error: "You don't have permission to change cost centres." };
    }
    if (e.status >= 500) {
      return { ok: false, error: "The server couldn't save this cost centre. Try again in a moment." };
    }
    return { ok: false, error: "Couldn't save this cost centre. Please try again." };
  }
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Something went wrong." };
}

function extractFrappeMessage(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const obj = detail as Record<string, unknown>;
  const exc = obj.exception;
  if (typeof exc === "string" && exc.trim()) {
    const stripped = stripHtml(exc.replace(/^[\w.]+:\s*/, "")).trim();
    if (stripped) return stripped;
  }
  const sm = obj._server_messages;
  if (typeof sm === "string") {
    try {
      const arr = JSON.parse(sm) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const parsed = arr.map((x) => (typeof x === "string" ? JSON.parse(x) : x)) as Array<{
        message?: string; indicator?: string;
      }>;
      const red = parsed.find((x) => x?.indicator === "red" || x?.indicator === "orange");
      const pick = red ?? parsed[0];
      if (pick?.message) return stripHtml(String(pick.message)).trim();
    } catch { /* fall through */ }
  }
  return null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<\s*(br|\/li|\/p|\/div|\/ul|\/ol)\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function createCostCenterAction(input: {
  costCenterName: string;
  company: string;
  parentCostCenter: string;
  isGroup: boolean;
}): Promise<Ok<{ name: string; message: string }> | Err> {
  if (!input.costCenterName.trim()) return { ok: false, error: "Name is required." };
  // Parent is optional on the UI — the Colossal fork's before_insert
  // hook auto-wires it to the company's root group (creating one if
  // none exists), so a fresh tenant isn't locked out of adding its
  // first cost centre.
  try {
    const created = await createCostCenter(input);
    revalidatePath("/accounting/cost-centers");
    return { ok: true, name: created.name, message: `Added ${created.name}.` };
  } catch (e) {
    return err(e);
  }
}

export async function updateCostCenterAction(
  name: string,
  patch: { costCenterName?: string; isGroup?: boolean; disabled?: boolean },
): Promise<Ok<{ name: string; message: string }> | Err> {
  try {
    const res = await updateCostCenter(name, patch);
    revalidatePath("/accounting/cost-centers");
    revalidatePath(`/accounting/cost-centers/${name}`);
    return { ok: true, name: res.name, message: res.name === name ? "Saved." : `Renamed to ${res.name}.` };
  } catch (e) {
    return err(e);
  }
}

export async function setCostCenterDisabledAction(
  name: string,
  disabled: boolean,
): Promise<Ok<{ message: string }> | Err> {
  try {
    await setCostCenterDisabled(name, disabled);
    revalidatePath("/accounting/cost-centers");
    return { ok: true, message: disabled ? "Disabled." : "Re-enabled." };
  } catch (e) {
    return err(e);
  }
}

export async function smartDeleteCostCenterAction(
  name: string,
): Promise<Ok<{ action: "deleted" | "disabled"; message: string }> | Err> {
  try {
    const res = await smartDeleteCostCenter(name);
    revalidatePath("/accounting/cost-centers");
    const message =
      res.action === "deleted"
        ? `${name} deleted.`
        : `${name} has ${res.reason}, so it was disabled instead of deleted (history preserved).`;
    return { ok: true, action: res.action, message };
  } catch (e) {
    return err(e);
  }
}

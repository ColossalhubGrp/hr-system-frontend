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
  if (e instanceof FrappeRequestError) return { ok: false, error: e.message || `Backend error (${e.status}).` };
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Something went wrong." };
}

export async function createCostCenterAction(input: {
  costCenterName: string;
  company: string;
  parentCostCenter: string;
  isGroup: boolean;
}): Promise<Ok<{ name: string; message: string }> | Err> {
  if (!input.costCenterName.trim()) return { ok: false, error: "Name is required." };
  if (!input.parentCostCenter.trim()) return { ok: false, error: "Parent is required." };
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

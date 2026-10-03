"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createItem,
  updateItem,
  setItemDisabled,
  createItemGroup,
  type ItemCreateInput,
  type ItemDefault,
} from "@/lib/frappe/item";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").optional().or(z.literal(""));

const defaultsSchema = z.object({
  company: z.string().trim().min(1, "Company is required."),
  default_warehouse: z.string().trim().optional(),
  income_account: z.string().trim().optional(),
  expense_account: z.string().trim().optional(),
});

const createSchema = z.object({
  item_code: z.string().trim().min(1, "Item code is required."),
  item_name: z.string().trim().min(1, "Item name is required."),
  item_group: z.string().trim().min(1, "Item group is required."),
  stock_uom: z.string().trim().min(1, "Unit of measure is required."),
  standard_rate: z.coerce.number().min(0, "Rate must be ≥ 0."),
  description: z.string().trim().optional(),
  image: z.string().trim().optional(),
  is_stock_item: z.enum(["0", "1", ""]).optional().transform((v) => v === "1"),
  is_fixed_asset: z.enum(["0", "1", ""]).optional().transform((v) => v === "1"),
  has_variants: z.enum(["0", "1", ""]).optional().transform((v) => v === "1"),
  has_batch_no: z.enum(["0", "1", ""]).optional().transform((v) => v === "1"),
  has_serial_no: z.enum(["0", "1", ""]).optional().transform((v) => v === "1"),
  opening_stock: z.coerce.number().min(0).optional(),
  valuation_rate: z.coerce.number().min(0).optional(),
  shelf_life_in_days: z.coerce.number().int().min(0).optional(),
  end_of_life: isoDate,
  weight_per_unit: z.coerce.number().min(0).optional(),
  weight_uom: z.string().trim().optional(),
  disabled: z.enum(["0", "1", ""]).optional().transform((v) => v === "1"),
  defaults_json: z
    .string()
    .trim()
    .default("[]")
    .transform((s) => {
      try { return JSON.parse(s); } catch { return []; }
    })
    .pipe(z.array(defaultsSchema).default([])),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) {
    return { error: err.message || `Backend error (${err.status}).` };
  }
  const msg = err instanceof Error ? err.message : "Something went wrong.";
  return { error: msg };
}

function fieldErrorsFrom(parsed: ReturnType<typeof createSchema.safeParse> & { success: false }): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors, error: "Please fix the highlighted fields." };
}

function buildInput(data: z.infer<typeof createSchema>): ItemCreateInput {
  const itemDefaults: ItemDefault[] = (data.defaults_json ?? []).map((d) => ({
    company: d.company,
    defaultWarehouse: d.default_warehouse || null,
    incomeAccount: d.income_account || null,
    expenseAccount: d.expense_account || null,
  }));
  return {
    itemCode: data.item_code,
    itemName: data.item_name,
    itemGroup: data.item_group,
    stockUom: data.stock_uom,
    standardRate: data.standard_rate,
    description: data.description || undefined,
    image: data.image || undefined,
    isStockItem: data.is_stock_item,
    isFixedAsset: data.is_fixed_asset,
    hasVariants: data.has_variants,
    hasBatchNo: data.has_batch_no,
    hasSerialNo: data.has_serial_no,
    openingStock: data.opening_stock ?? 0,
    valuationRate: data.valuation_rate ?? 0,
    shelfLifeInDays: data.shelf_life_in_days ?? 0,
    endOfLife: data.end_of_life || undefined,
    weightPerUnit: data.weight_per_unit ?? 0,
    weightUom: data.weight_uom || undefined,
    disabled: data.disabled,
    itemDefaults,
  };
}

export async function createItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed);

  let created: { name: string };
  try {
    created = await createItem(buildInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/accounting/items");
  redirect(`/accounting/items/${encodeURIComponent(created.name)}`);
}

export async function updateItemAction(
  name: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed);

  try {
    await updateItem(name, buildInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/accounting/items");
  revalidatePath(`/accounting/items/${name}`);
  redirect(`/accounting/items/${encodeURIComponent(name)}`);
}

export async function setItemDisabledAction(
  name: string,
  disabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await setItemDisabled(name, disabled);
    revalidatePath("/accounting/items");
    revalidatePath(`/accounting/items/${name}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not toggle status.";
    return { ok: false, error: msg };
  }
}

/** Used as a `<form action>` directly from a Server Component, which
 *  requires the signature `(FormData) => void | Promise<void>`. On
 *  validation failure we throw rather than return — the browser gets
 *  Next.js's default error, which is fine for this cheap master. */
export async function createItemGroupAction(formData: FormData): Promise<void> {
  const name = String(formData.get("group_name") ?? "").trim();
  const parent = String(formData.get("parent") ?? "").trim();
  if (!name) throw new Error("Group name is required.");
  await createItemGroup(name, parent || undefined);
  revalidatePath("/accounting/items/groups");
  revalidatePath("/accounting/items/new");
  redirect("/accounting/items/groups");
}

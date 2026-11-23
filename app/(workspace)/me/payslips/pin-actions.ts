"use server";

import { revalidatePath } from "next/cache";
import { frappeCall } from "@/lib/frappe/client";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";

export type SetPinState = StdFormState & { ok?: boolean };

/**
 * Set or change the signed-in employee's payslip PIN. The PIN locks
 * their WhatsApp payslip PDFs and is never shown anywhere — not here
 * after it's saved, not in the chat. We validate locally for a tight
 * inline error, then the backend validates again (4-8 digits, not
 * trivial, correct current PIN when changing).
 */
export async function setPayslipPinAction(
  _prev: SetPinState,
  form: FormData,
): Promise<SetPinState> {
  const pin = String(form.get("pin") ?? "").trim();
  const confirm = String(form.get("confirm") ?? "").trim();
  const current = String(form.get("current") ?? "").trim();

  if (!/^\d{4,8}$/.test(pin)) {
    return {
      error: "Check the highlighted field.",
      fieldErrors: { pin: "Your PIN must be 4 to 8 digits." },
    };
  }
  if (pin !== confirm) {
    return {
      error: "Check the highlighted field.",
      fieldErrors: { confirm: "The two PINs don't match." },
    };
  }

  try {
    await frappeCall({
      method: "recruitment_app.api.payslip_pin.set_payslip_pin",
      verb: "POST",
      args: { pin, current },
      as: "user",
    });
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/me/payslips");
  return { ok: true };
}

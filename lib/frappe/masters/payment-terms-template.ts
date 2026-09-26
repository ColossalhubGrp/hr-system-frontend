import "server-only";
import { frappeCall } from "../client";

/**
 * ERPNext "Payment Terms Template" — the parent doctype that groups
 * one or more Payment Term rows. Customer.payment_terms and
 * Supplier.payment_terms both link to THIS, not to Payment Term
 * directly. Loading Payment Term rows into a Customer/Supplier form
 * causes a link-validation 417 on save.
 */

export type PaymentTermsTemplate = {
  name: string;
  templateName: string;
};

export async function listPaymentTermsTemplates(): Promise<PaymentTermsTemplate[]> {
  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Payment Terms Template",
        fields: ["name", "template_name"],
        order_by: "template_name asc",
        limit_page_length: 0,
      },
    });
    return rows.map((r) => ({
      name: String(r.name ?? ""),
      templateName: String(r.template_name ?? r.name ?? ""),
    }));
  } catch {
    return [];
  }
}

import "server-only";
import { frappeCall } from "./client";

export type PayableAccountRow = {
  name: string;
  accountName: string;
  accountNumber: string | null;
  parentAccount: string | null;
  disabled: boolean;
};

type Raw = {
  name: string;
  account_name: string;
  account_number: string | null;
  parent_account: string | null;
  disabled: 0 | 1 | null;
};

export async function listPayableAccountsForCompany(
  company: string,
): Promise<PayableAccountRow[]> {
  if (!company) return [];
  try {
    const rows = await frappeCall<Raw[]>({
      method:
        "recruitment_app.api.approvals.admin_list_payable_accounts_manage",
      args: { company },
      as: "user",
    });
    return (rows ?? []).map((r) => ({
      name: r.name,
      accountName: r.account_name,
      accountNumber: r.account_number,
      parentAccount: r.parent_account,
      disabled: Boolean(r.disabled),
    }));
  } catch {
    return [];
  }
}

export async function createPayableAccount(input: {
  company: string;
  accountName: string;
  accountNumber?: string;
  parentAccount?: string;
}): Promise<string> {
  const r = await frappeCall<{ ok: boolean; name: string }>({
    method: "recruitment_app.api.approvals.admin_create_payable_account",
    verb: "POST",
    args: {
      company: input.company,
      account_name: input.accountName,
      ...(input.accountNumber ? { account_number: input.accountNumber } : {}),
      ...(input.parentAccount ? { parent_account: input.parentAccount } : {}),
    },
    as: "user",
  });
  return r.name;
}

export async function deletePayableAccount(name: string): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_delete_payable_account",
    verb: "POST",
    args: { name },
    as: "user",
  });
}

/** Resolve the current signed-in user's default company — Employee ▸
 *  User ▸ global defaults. Returns null when nothing is set. Reused
 *  across forms to pre-fill Company pickers so HR doesn't have to
 *  choose their own company every time. */
export async function getDefaultCompanyForMe(): Promise<string | null> {
  try {
    const r = await frappeCall<{ company: string | null }>({
      method: "recruitment_app.api.approvals.admin_default_company_for_me",
      as: "user",
    });
    return r.company ?? null;
  } catch {
    return null;
  }
}

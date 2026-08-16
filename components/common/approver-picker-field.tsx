"use client";

import { Field, SelectInput } from "@/components/employee/form-bits";
import type { EmployeeDirectoryEntry } from "./employee-picker-field";

/**
 * Picker for approver / reviewer fields.
 *
 * The user model is: approvers ARE employees — HR, managers, execs
 * all have employee records. So this picker shows every employee.
 * The stored value is the employee's id; the server-side action
 * resolves the id to the linked user_id (email) before sending to
 * Frappe, because Frappe's Approver fields are Link-to-User under
 * the hood and notifications go to the user's email.
 *
 * If the picked employee has no linked user account, the server
 * returns a targeted "needs a login account first" error so the
 * user gets a clear action to take instead of a raw Frappe throw.
 *
 * The initial value may arrive as either an employee id (fresh
 * form) or an email/user_id (existing record loaded from Frappe).
 * We reverse-look-up the email against directory.user_id so the
 * field renders with the right employee pre-selected in either
 * case. Values that match neither (Administrator, ex-employee,
 * system integration accounts) are prepended verbatim so the
 * field still shows them instead of dropping to blank.
 */
export function ApproverPickerField({
  name,
  label = "Approver",
  required,
  error,
  hint,
  directory,
  defaultValue,
  placeholder = "Select approver",
}: {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  directory: EmployeeDirectoryEntry[];
  /** Employee id OR user_id (email). Component reverse-maps if it's
   *  an email so the correct employee is pre-selected. */
  defaultValue?: string;
  placeholder?: string;
}) {
  const options = directory.map((e) => ({
    value: e.id,
    label: `${e.employee_name} (${e.id})`,
  }));

  let resolvedDefault = defaultValue;
  if (defaultValue && !options.some((o) => o.value === defaultValue)) {
    const byUserId = directory.find((e) => e.user_id === defaultValue);
    if (byUserId) {
      resolvedDefault = byUserId.id;
    } else {
      // Unknown value (Administrator / ex-employee / integration user) —
      // keep it so the form still shows what was previously stored.
      options.unshift({ value: defaultValue, label: defaultValue });
    }
  }

  return (
    <Field
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={hint}
    >
      <SelectInput
        id={name}
        name={name}
        options={options}
        defaultValue={resolvedDefault}
        placeholder={placeholder}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

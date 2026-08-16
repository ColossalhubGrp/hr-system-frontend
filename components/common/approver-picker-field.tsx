"use client";

import { Field, SelectInput } from "@/components/employee/form-bits";
import type { EmployeeDirectoryEntry } from "./employee-picker-field";

/**
 * Picker for approver / reviewer fields.
 *
 * Backend expectation is a Frappe user_id (email) — that's who the
 * notification is sent to. The user model here is that everyone who
 * can approve IS also an Employee (HR, managers, execs — all have
 * employee records), so we surface the picker as an employee list
 * and post the picked employee's user_id under the hood.
 *
 * Employees without a linked user account are filtered out (they
 * can't receive notifications so they can't be approvers). If the
 * form was pre-filled with an email that doesn't match any employee
 * (e.g. Administrator, an ex-employee, a system integration user)
 * we prepend that raw email so the field still renders it instead
 * of dropping to blank on load.
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
  /** user_id (email) that should be pre-selected. */
  defaultValue?: string;
  placeholder?: string;
}) {
  const options = directory
    .filter((e): e is EmployeeDirectoryEntry & { user_id: string } =>
      Boolean(e.user_id),
    )
    .map((e) => ({
      value: e.user_id,
      label: `${e.employee_name} (${e.user_id})`,
    }));
  const withDefault =
    defaultValue && !options.some((o) => o.value === defaultValue)
      ? [{ value: defaultValue, label: defaultValue }, ...options]
      : options;
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
        options={withDefault}
        defaultValue={defaultValue}
        placeholder={placeholder}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

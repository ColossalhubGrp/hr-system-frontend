"use client";

import { Field, SelectInput } from "@/components/employee/form-bits";

export type EmployeeDirectoryEntry = {
  id: string;
  employee_name: string;
  user_id: string | null;
  department: string | null;
  designation: string | null;
  pay_grade: string | null;
  company: string | null;
};

/** Options list for the picker. When `ensureValue` is passed and isn't
 *  in the directory (e.g. an Inactive employee that was pre-selected),
 *  prepend a raw-ID entry so the picker still renders that value
 *  instead of showing blank. */
export function employeeOptions(
  dir: EmployeeDirectoryEntry[],
  ensureValue?: string,
): Array<{ value: string; label: string }> {
  const opts = dir.map((e) => ({
    value: e.id,
    label: `${e.employee_name} (${e.id})`,
  }));
  if (ensureValue && !opts.some((o) => o.value === ensureValue)) {
    return [{ value: ensureValue, label: ensureValue }, ...opts];
  }
  return opts;
}

export function EmployeePickerField({
  name,
  label = "Employee",
  required,
  error,
  hint,
  directory,
  defaultValue,
  value,
  onChange,
  placeholder = "Select employee",
}: {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  directory: EmployeeDirectoryEntry[];
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}) {
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
        options={employeeOptions(directory, defaultValue ?? value)}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

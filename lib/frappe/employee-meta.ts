/**
 * Static choices the client form needs at render time. Kept in a separate
 * module from the write helpers so client components can import without
 * pulling `server-only` boundaries with them.
 */
export const EMPLOYEE_GENDERS = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
];

export const EMPLOYEE_STATUSES = ["Active", "Inactive", "Suspended", "Left"];

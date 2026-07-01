# Reference Data — Next.js side

Frontend integration for the bench-wide reference-data framework. The
backend half lives in
`apps/tenant_manager/tenant_manager/reference_data/`; this is the React
layer that consumes it.

## Files

```
lib/references/
├── types.ts                       — TS types (client-safe; no server-only)
├── server.ts                      — server-only fetcher via frappeCall
├── use-reference-data.ts          — client hook with TTL cache
└── README.md                      — this file

app/api/references/[master]/route.ts — REST endpoint the hook calls
components/references/
├── reference-select.tsx           — drop-in shadcn Select fed by a master
└── value-form.tsx                 — admin form for create/edit a row

app/(workspace)/admin/
├── layout.tsx                     — HR_ADMIN gate
└── references/
    ├── actions.ts                 — Server Actions: upsert + deactivate
    ├── page.tsx                   — list all masters, grouped by module
    └── [master]/page.tsx          — per-master CRUD
```

## Three ways to consume reference data

### 1. Server Component / Server Action

Direct, no round-trip. Use this in pages and actions:

```ts
import { listValues } from "@/lib/references/server";

export default async function MyPage() {
  const { rows } = await listValues("Department");
  return <DepartmentPicker options={rows} />;
}
```

Available exports from `lib/references/server.ts`:

| Function | Returns | Purpose |
|---|---|---|
| `listMasters()` | `ReferenceMasterMeta[]` | Every master the caller can read. |
| `describeMaster(name)` | `ReferenceMasterDescribe \| null` | Schema + row count. |
| `listValues(master, opts?)` | `{rows, total}` | Paginated rows. |
| `upsertValue(master, title, payload?)` | `ReferenceRow` | Create-or-update by title. |
| `deactivate(master, name)` | `void` | Soft-delete. |

### 2. Client component — drop-in `<ReferenceSelect>`

Replaces a hardcoded `<select>` in any form:

```tsx
import { ReferenceSelect } from "@/components/references/reference-select";

<ReferenceSelect
  master="Employment Type"
  name="employment_type"
  defaultValue={initial?.employmentType}
  placeholder="Select…"
/>
```

Behaviour:

- Fetches options on mount via `/api/references/<master>`.
- Shows a loading state, an empty state, an error state — no consumer
  code needed.
- Renders a hidden `<input>` so the value submits with the surrounding
  `<form>` (works with React Server Actions).
- If the currently-selected value isn't in the loaded options (e.g. it
  was just deactivated, or rows haven't loaded yet on an edit form),
  keeps it visible so the form doesn't silently lose the value.
- Controlled or uncontrolled — pass `value + onValueChange` or just
  `name + defaultValue`.

### 3. Custom client UI — `useReferenceData` hook

For typeahead/search-as-you-type and custom rendering:

```tsx
"use client";
import { useReferenceData } from "@/lib/references/use-reference-data";

const { rows, loading, error, refresh } = useReferenceData("Department", {
  search: query,
  includeInactive: showArchived,
  company: currentCompany,
});
```

Cache: 30s TTL per `(master, search, includeInactive, company, limit)`
key, with concurrent-request coalescing. Call
`invalidateReferenceData(master)` after an admin edit to drop entries
for one master.

## Admin workspace

`/admin/references` (HR_ADMIN-gated) lists every master with row counts,
grouped by module. Click in for a per-master CRUD page.

The list comes from `tenant_manager.reference_data.api.references.list_masters`
which filters by Frappe DocPerm, so users only see masters they can
read.

## Backwards-compat for existing forms

If a page already calls `frappe.client.get_list` for a master (the
pattern most smart_hr_web forms use today), no migration is needed —
once the framework promotes the underlying Select to a Link, the
existing query returns the rows from the master. Use `<ReferenceSelect>`
only when adding new pickers; existing pickers Just Work.

## Smoke

```bash
npx tsc --noEmit          # 0 errors expected
npm run build             # ✓ Compiled successfully expected
npm run lint              # warnings only (recruitment ports); 0 errors
```

The framework's server-side smoke test runs from the bench:

```bash
bench --site <site> execute tenant_manager.reference_data._check_api.run
```

That confirms the data the Next.js layer reads is what's expected.

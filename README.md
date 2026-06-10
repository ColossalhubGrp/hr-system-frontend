# Colossal HR — Web

Next.js 14 (App Router, TypeScript strict) frontend for the Colossal HR backend.

The backend is a Frappe site (`recruitment.colossal`) running at
`http://localhost:8000`. This app reads via Frappe REST using a server-side
token, so credentials never reach the browser.

## Stack

- Next.js 14 App Router, React 18, TypeScript strict
- Tailwind CSS with project-specific tokens
- Recharts for KPI sparklines, bar, and donut charts
- Lucide icons
- `zod` for env validation

## Setup

```bash
cd /home/unclejoe/frappe/smart_hr_web
npm install
cp .env.example .env.local
```

Generate a server-to-server token in Frappe (Administrator user → API Access),
then paste the values into `.env.local`:

```bash
bench --site recruitment.colossal console
>>> import frappe
>>> frappe.set_user("Administrator")
>>> frappe.db.get_value("User", "Administrator", "api_key")
# If blank:
>>> from frappe.core.doctype.user.user import generate_keys
>>> generate_keys("Administrator")
```

`generate_keys` prints the secret once; copy it into `FRAPPE_API_SECRET`.

## Dev server

```bash
npm run dev
```

Open <http://localhost:3000>. Root redirects to `/dashboard`.

## Routes

- `/dashboard` — Overall Dashboard
- `/hr` — HR Dashboard (HR section expanded in the sidebar)

Both pages render server-side, calling Frappe once per page via the typed
client in `lib/frappe/`. Cached for 60 s per the `revalidate` hint.

## Project layout

```
app/
  layout.tsx                  // Root: fonts, metadata, theme colour
  page.tsx                    // Redirect to /dashboard
  (workspace)/
    layout.tsx                // Sidebar + topbar shell
    dashboard/page.tsx        // Overall Dashboard
    hr/page.tsx               // HR Dashboard

components/
  layout/                     // Sidebar, Topbar, BrandMark, nav-config
  dashboard/                  // KpiCard, ChartCard, charts, range pills

lib/
  env.ts                      // zod-validated server + public env
  cn.ts                       // tailwind-merge helper
  frappe/
    client.ts                 // server-only Frappe REST client
    queries.ts                // typed snapshot fetchers
```

## Design notes

The purple rail, light grey canvas, and soft cards in the mockups are
encoded as Tailwind tokens (`ink-*`, `canvas`, `surface`, `card` rounding,
`shadow-card`). The brand "C" mark is an inline SVG (`components/layout/brand-mark.tsx`),
no asset round-trip.

## Status

This is the first slice (shell + Overall + HR dashboard). Per the SRS roadmap,
the next slices add login + session cookie forwarding, the Employee directory
and detail tabs, and the Leaves / Recruitment surfaces.

## Conventions

- Server Components by default. Mark client components with `"use client"`
  only when they need browser APIs (charts, the sidebar toggle, the topbar).
- All env access goes through `lib/env.ts` so missing values fail fast with
  a readable error.
- No raw `fetch(FRAPPE_URL...)` outside `lib/frappe/`.
- Imports use the `@/` alias.

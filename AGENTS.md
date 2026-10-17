# Meridian Ops — guide for agents

Meridian Ops is the internal back office of Meridian Supply Co., a small
wholesale distributor. The people who use it are not engineers: operations,
finance, sales and warehouse staff. They describe changes in plain language
and Theseus turns them into previews against this repository. Keep changes
small, obvious and consistent with what is already here.

## Stack

- Next.js 16 (App Router, React Server Components, Server Actions), TypeScript, Tailwind CSS v4.
- UI components from shadcn (`src/components/ui`, Base UI primitives). Do not edit those files; compose them.
- SQLite through Node's built-in `node:sqlite` (no native modules, no ORM). Plain SQL lives in `src/lib/data/*`.
- Tests: Vitest, against an in-memory database (`DATA_DIR=":memory:"` is set by `vitest.config.ts`).
- Node 24 or newer.

## Layout

| Path | What lives there |
|---|---|
| `src/app/(app)/` | One folder per screen. Pages are async server components that call the data layer directly. |
| `src/app/(app)/layout.tsx` | Sidebar, header, user switcher. |
| `src/components/` | App components (`status-badge`, `stat-card`, `filter-tabs`, `action-button`, forms under `forms/`). |
| `src/components/ui/` | Generated shadcn components. Add new ones with `npx shadcn@latest add <name>`; never hand-edit. |
| `src/lib/db/schema.ts` | Tables (`CREATE TABLE IF NOT EXISTS`) and the ordered `migrations` list. |
| `src/lib/db/seed.ts` | Deterministic demo data. Update it when you add a table or column that should have sample rows. |
| `src/lib/db/index.ts` | Opens the database, applies migrations, seeds when empty. `q(sql)` returns plain row objects. |
| `src/lib/data/*.ts` | Typed queries and mutations per module: customers, orders, invoices, products, expenses, staff, activity, dashboard. All business rules live here. |
| `src/lib/actions.ts` | Server actions. Thin: read the form, call the data layer, `revalidatePath`, return `{ error }` on failure. |
| `src/lib/session.ts` | Who is acting (cookie set by the user switcher). There is no login. |
| `src/lib/types.ts` | Row types and the status/category enums. |
| `src/lib/format.ts` | Money (integer cents, USD), dates, relative time. |

## Conventions

- Money is stored as integer cents; format with `formatMoney`. Dates are ISO strings in UTC.
- Reads go through `q(sql).all()/.get()` so rows are plain objects (React refuses to pass `node:sqlite` rows to client components).
- Every mutation lives in `src/lib/data`, validates its input with a thrown `Error` carrying a user-readable message, and records a row in `activity` via `recordActivity`.
- Server actions catch those errors and return `{ error }`; forms show it with `FormError`, buttons use `ActionButton` to show a toast.
- Status colours are one map in `src/components/status-badge.tsx`; add a key there for a new status.
- Lists filter with `FilterTabs` (query-string links rendered on the server), not client state.
- Forms use native `<input>`/`<select>` (`NativeSelect`) inside `<form action={serverAction}>` with `useActionState`. No client-side fetch to API routes; there are none.
- Schema change: add the table or column to `schema.ts` (new tables with `IF NOT EXISTS`; changes to existing tables as an `ALTER TABLE` string appended to `migrations`), update `seed.ts`, add or extend a type in `types.ts`.
- Every page is dynamic (`force-dynamic` in the root layout); do not add caching.

## Commands

```bash
npm ci                 # install
npm run dev            # http://localhost:3000
npm run build && npm start   # production build, served from .next/standalone
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest run
npm run build          # production build (standalone output)
npm run db:reset       # delete the local SQLite file; it is recreated and reseeded on next start
```

Before finishing a change run all four validation commands: `npm run typecheck && npm run lint && npm test && npm run build`. They are what the platform runs before a preview is started.

## Testing

Add tests under `src/lib/data/__tests__/` next to the existing ones. Each test file gets a fresh in-memory database; call `resetDatabase()` in `beforeEach` to reseed. Test the data layer (rules, totals, status transitions), not the rendering.

## Pitfalls

- Do not start `next dev` or `next start` and leave it running; commands must exit.
- `src/components/ui/*` files are generated; a lint rule or style you dislike there is not yours to fix.
- The `data/` directory holds the local database and is git-ignored.
- Keep `next.config.ts` `output: "standalone"`; `npm start` runs `.next/standalone/server.js` and the `postbuild` script copies `public/` and `.next/static` next to it. Do not rename these scripts.

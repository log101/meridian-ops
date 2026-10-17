# Meridian Ops

The internal back office of Meridian Supply Co., a fictional wholesale
distributor: customers, sales orders, invoices, inventory and expense
approvals. It exists as a realistic target for [Theseus](https://theseus.sh):
a full-stack Next.js app that non-technical staff would want to change, with
the Theseus contract files committed so a connected workspace reaches READY
without a setup agent.

Live demo: https://demo.theseus.sh (shared data, reset from Settings or on
every container restart).

## Run it

```bash
npm ci
npm run dev        # http://localhost:3000
```

Node 24 or newer. The database is SQLite through Node's built-in
`node:sqlite`; it is created and seeded in `./data` on first request. Delete
it with `npm run db:reset`.

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Docker: `docker build -t meridian-ops .` then
`docker run -p 3000:3000 meridian-ops`. Pass
`--build-arg NEXT_PUBLIC_THESEUS_URL=https://...` to show the
"Request a change" button.

## How it is built

See [AGENTS.md](AGENTS.md): it is the guide feature agents follow and
doubles as the architecture note. In short: App Router pages call a typed
data layer (`src/lib/data`) that holds every business rule over plain SQL,
server actions in `src/lib/actions.ts` wire forms to it, and Vitest covers
the data layer against an in-memory database.

## Theseus files

| File | Purpose |
|---|---|
| `preview.json` | Setup command, start command and readiness probe for a sandbox |
| `theseus.yaml` | Protected paths and the validation commands every change must pass |
| `AGENTS.md` | Guidance the feature agent reads |
| `theseus-install.sh` | Installs Node 24 in a fresh sandbox; idempotent |
| `.theseus-engine` | Contract version |

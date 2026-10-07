# firstplay

Privacy-first funnel analytics for HTML5 games: what players do in the first 30 seconds after the page loads.

## Packages

| Package             | What it is                                                                              |
| ------------------- | --------------------------------------------------------------------------------------- |
| `packages/contract` | The event batch schema (zod) shared by the game beacon, the collector and the dashboard |
| `apps/collector`    | Event collector: Cloudflare Worker (Hono) → Hyperdrive → Postgres                       |
| `apps/dashboard`    | Funnel dashboard — later                                                                |

## Development

Requires Node 24 and pnpm 12.

```bash
pnpm install
pnpm test        # tests in every package (the collector's run inside workerd)
pnpm typecheck
pnpm lint
pnpm format:check
```

## Collector

`POST /e` takes a batch sent with `navigator.sendBeacon` (a `text/plain` JSON body) and answers:

| Status | When                                                            |
| ------ | --------------------------------------------------------------- |
| 204    | stored; a resent event is skipped by its id                     |
| 400    | not JSON, or the batch breaks the contract (issues in the body) |
| 403    | the `Origin` is not in `ALLOWED_ORIGINS`                        |
| 413    | the body is over 8 KB                                           |

`GET /health` answers `ok`.

### Run locally against a local Postgres

```bash
psql -d postgres -c "CREATE ROLE firstplay LOGIN PASSWORD 'firstplay'"   # Hyperdrive needs a password
createdb -O firstplay firstplay_dev
cd apps/collector
cp .env.example .env    # Hyperdrive's local connection string
DATABASE_URL=postgres://firstplay:firstplay@localhost:5432/firstplay_dev pnpm db:migrate
pnpm dev                # http://localhost:8787
```

### Deploy

1. Create a Postgres database on [Neon](https://neon.tech) and copy its **direct** (not pooled) connection string.
2. Apply the migrations: `DATABASE_URL='<connection string>' pnpm --filter @firstplay/collector db:migrate`.
3. `pnpm --filter @firstplay/collector exec wrangler login`, then create the Hyperdrive config:
   `pnpm --filter @firstplay/collector exec wrangler hyperdrive create firstplay-db --connection-string='<connection string>'`.
4. Put the printed id into `apps/collector/wrangler.jsonc` → `hyperdrive[0].id`.
5. `pnpm --filter @firstplay/collector run deploy`.

Schema changes: edit `src/db/schema.ts`, run `pnpm db:generate --name <change>`, commit the SQL in `drizzle/`.

# firstplay

Privacy-first funnel analytics for HTML5 games: what players do in the first 30 seconds after the page loads.

## Packages

| Package             | What it is                                                                              |
| ------------------- | --------------------------------------------------------------------------------------- |
| `packages/contract` | The event batch schema (zod) shared by the game beacon, the collector and the dashboard |
| `apps/collector`    | Event collector on Cloudflare Workers — next                                            |
| `apps/dashboard`    | Funnel dashboard — later                                                                |

## Development

Requires Node 24 and pnpm 12.

```bash
pnpm install
pnpm test        # tests in every package
pnpm typecheck
pnpm lint
pnpm format:check
```

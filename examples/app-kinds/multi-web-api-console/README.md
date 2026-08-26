# multi-web-api-console

Minimal **AppKind** smoke example: one project with three apps.

| App | `kind` | How to run |
| --- | --- | --- |
| `web/` | `web` | `deno task dev:web` |
| `api/` | `api` | `deno task dev:api` → `GET /hello` |
| `console/` | `console` | `deno task run:hello` or `deno run -A ../../../src/cli.ts run hello/world` |

## Console DX

```bash
# list commands
deno run -A ../../../src/cli.ts run --list

# module help (named actions only — exit 2 with action list)
deno run -A ../../../src/cli.ts run hello

# run with passthrough flags
deno run -A ../../../src/cli.ts run hello/world -- --name Ada

# timeout (ms); exit 124 on timeout
deno run -A ../../../src/cli.ts run hello/world --timeout 10000
```

Global middlewares live in `console/middlewares/*.ts` (see `timing.ts`).
Route modules may also export `before` / `after` hooks.

## Notes

- Uses local `@dreamer/dweb` via `../../../src/mod.ts` (workspace smoke, not JSR).
- At most **one** `console/` per project (product rule).
- Pure API handlers live under `api/routes/` (flat), not forced under `routes/api/`.

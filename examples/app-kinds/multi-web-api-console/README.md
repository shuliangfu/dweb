# multi-web-api-console

Minimal **AppKind** smoke example: one project with three apps.

| App        | `kind`    | How to run                                                          |
| ---------- | --------- | ------------------------------------------------------------------- |
| `web/`     | `web`     | `deno task dev:web`                                                 |
| `api/`     | `api`     | `deno task dev:api` → `GET /hello`                                  |
| `console/` | `console` | `deno task run:hello` / `deno task run:team` / `deno task run:list` |

## Console DX

`console/main.ts` is the Console App entry (`export default app`). Middleware
and plugins can be declared there (`app.use`, `app.registerPlugin` / `plugins`)
and in `console/config` (`plugins` / `middlewares`). Both take effect on
`dweb-cli run`. Do not call `start()` in the entry; the CLI starts the app.

```bash
# list commands
deno task run:list

# no directory middleware (hello/world lives at routes/hello.ts)
deno task run:hello
# or: deno run -A ../../../src/cli.ts run hello/world --name 张三

# directory middleware wraps routes/team/* only
deno task run:team
deno task run:team:list
# or: deno run -A ../../../src/cli.ts run team/hello --name 李四

# module help (named actions only — exit 2 with action list)
deno run -A ../../../src/cli.ts run hello

# timeout (ms); exit 124 on timeout
deno run -A ../../../src/cli.ts run hello/world --timeout 10000
```

`team/hello` and `team/list` go through `console/routes/team/_middleware.ts`.
`hello/world` does not. Expected order for `deno task run:team` (outer to
inner):

1. Plugin `onInit`: `[plugin] console-ready` (from `config.plugins`)
2. Global `console/middlewares/timing.ts` (logs duration at `info`)
3. `config.middlewares`: `[config] team/hello`
4. `app.use()` in `console/main.ts`: `[entry] team/hello`
5. Directory `_middleware.ts`: `[team] start team/hello` …
   `[team] done team/hello`
6. Action: `你好，张三！`
7. Timing line: `console team/hello took …ms`

Middleware order (outer to inner):

1. Global `console/middlewares/*.ts` (filename sort; see `timing.ts`)
2. `config.middlewares` (including `main.dev.ts` / `main.prod.ts`)
3. `app.use()` in `console/main.ts`
4. Directory `_middleware.ts` under `routes/` (root to the command directory)
5. Route module `before` / action / `after`

`timing.ts` logs with `ctx.log.info`. Debug-level logs are hidden when
`logger.level` is `info`.

## Notes

- Uses local `@dreamer/dweb` via `../../../src/mod.ts` (workspace smoke, not
  JSR).
- At most **one** `console/` per project (product rule).
- Pure API handlers live under `api/routes/` (flat), not forced under
  `routes/api/`.

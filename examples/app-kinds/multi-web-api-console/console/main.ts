/**
 * Console app entry (no HTTP). Loaded by `dweb-cli run`.
 * Configure middleware and plugins here; `config/` is merged automatically.
 * Do not call start() here; the CLI starts the app.
 *
 * Middleware order (outer to inner):
 * 1. console/middlewares/*.ts (filename sort)
 * 2. config.middlewares (including main.dev.ts / main.prod.ts)
 * 3. app.use() in this file
 * 4. directory _middleware.ts under routes (root to command directory)
 * 5. route module before to action to after
 */
import { App } from "@dreamer/dweb/core/app";
import type { ConsoleMiddleware } from "@dreamer/dweb";
import { whoamiPlugin } from "./plugins/whoami.ts";

// Plugins can also be registered here, with the same options as console/config:
// const app = new App({
//   kind: "console",
//   plugins: [
//     staffPlugin({ routesDir: "routes", basePath: "staff" }),
//     whoamiPlugin(),
//   ],
// });
// const app = new App({ kind: "console" });
const app = new App();
// app.kind = "console";

const entryTag: ConsoleMiddleware = async (ctx, next) => {
  console.log(`[entry] ${ctx.name}`);
  return await next();
};
app.use(entryTag);

// staffPlugin is already registered in console/config/main.ts. To register it
// here instead:
// import { staffPlugin } from "./plugins/staff/mod.ts";
// app.registerPlugin(staffPlugin({ routesDir: "routes", basePath: "staff" }));
app.registerPlugin(whoamiPlugin());

export default app;

import type { AppPlugin } from "@dreamer/dweb";

/** Options passed when registering the plugin in config or main.ts. */
export interface StaffPluginOptions {
  /** Command directory, same name as host `console/routes` by default. */
  routesDir?: string;
  /** Command base path, for example `staff/hello`. */
  basePath?: string;
}

/**
 * Console plugin with multiple commands under `routes/`, the same
 * directory name as host `console/routes`. Pass `routesDir` when
 * registering the plugin to use another directory (relative paths
 * resolve against this module's directory).
 *
 * After this plugin is added in `console/config` or `console/main.ts`,
 * run: `dweb-cli run staff/hello` and `dweb-cli run staff/list`.
 */
export function staffPlugin(options: StaffPluginOptions = {}): AppPlugin {
  return {
    name: "staff",
    version: "1.0.0",
    console: {
      baseDir: new URL(".", import.meta.url),
      routesDir: options.routesDir ?? "routes",
      basePath: options.basePath ?? "staff",
    },
  };
}

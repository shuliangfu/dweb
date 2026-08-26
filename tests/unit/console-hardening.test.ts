/**
 * Console 加固：模块 help、超时、多应用边界
 */

import "../setup.ts";
import {
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import type { ConsoleContext } from "../../src/feature/console-context.ts";
import { ConsoleTimeoutError } from "../../src/cmd/run.ts";
import {
  ConsoleModuleHelpError,
  ConsoleRouteNotFoundError,
  invokeConsoleAction,
  resolveConsoleRoute,
} from "../../src/feature/console-router.ts";
import { resolveConsoleRoot } from "../../src/utils/console-root.ts";

describe("console hardening", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-hard-" });
  });

  afterEach(async () => {
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("run hello（仅具名动作）应抛 ConsoleModuleHelpError", async () => {
    const routesDir = join(tmp, "routes");
    await ensureDir(routesDir);
    await writeTextFile(
      join(routesDir, "hello.ts"),
      `export const meta = {
  description: "Hello cmds",
  actions: { world: { description: "Greet" } },
};
export async function world() {}
`,
    );
    const resolved = await resolveConsoleRoute(routesDir, "hello");
    let err: unknown;
    try {
      await invokeConsoleAction(
        resolved,
        { name: "hello", options: {}, args: [] } as unknown as ConsoleContext,
      );
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConsoleModuleHelpError);
    expect((err as ConsoleModuleHelpError).helpText).toContain("hello/world");
    expect((err as ConsoleModuleHelpError).helpText).toContain("Greet");
  });

  it("超时 Promise.race 语义：超时应先于慢动作", async () => {
    const slow = new Promise<number>((resolve) => {
      setTimeout(() => resolve(0), 500);
    });
    const ac = new AbortController();
    let timedOut = false;
    try {
      await Promise.race([
        slow,
        new Promise<number>((_, reject) => {
          setTimeout(() => {
            ac.abort();
            reject(new ConsoleTimeoutError(50));
          }, 50);
        }),
      ]);
    } catch (e) {
      timedOut = e instanceof ConsoleTimeoutError;
    }
    expect(timedOut).toBe(true);
    expect(ac.signal.aborted).toBe(true);
  });

  it("多应用：默认解析到 console/；-a web 指向无 console 配置时应能区分根", async () => {
    await ensureDir(join(tmp, "web", "routes"));
    await ensureDir(join(tmp, "web", "config"));
    await ensureDir(join(tmp, "console", "routes"));
    await ensureDir(join(tmp, "console", "config"));
    await writeTextFile(
      join(tmp, "deno.json"),
      JSON.stringify({
        tasks: {
          "dev:web": "deno run -A web/main.ts --dev",
          "build:web": "deno run -A web/main.ts --build",
          "start:web": "deno run -A dist/web/server.js --start",
        },
      }),
    );
    await writeTextFile(
      join(tmp, "console", "config", "main.ts"),
      `export default { kind: "console", name: "cli" };\n`,
    );
    await writeTextFile(
      join(tmp, "web", "config", "main.ts"),
      `export default { kind: "web", name: "web" };\n`,
    );

    const consoleRoot = await resolveConsoleRoot(tmp);
    expect(consoleRoot).toBe(join(tmp, "console"));

    const webRoot = await resolveConsoleRoot(tmp, { app: "web" });
    expect(webRoot).toBe(join(tmp, "web"));
  });

  it("路由含 .. 应被拒绝", async () => {
    const routesDir = join(tmp, "routes");
    await ensureDir(routesDir);
    let err: unknown;
    try {
      await resolveConsoleRoute(routesDir, "../secret");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConsoleRouteNotFoundError);
    expect((err as Error).message).toMatch(/Invalid console route segment/i);
  });

  it("多应用无 console/ 时应抛错", async () => {
    await ensureDir(join(tmp, "web", "routes"));
    await writeTextFile(
      join(tmp, "deno.json"),
      JSON.stringify({
        tasks: {
          "dev:web": "deno run -A web/main.ts --dev",
          "build:web": "deno run -A web/main.ts --build",
        },
      }),
    );
    let threw = false;
    try {
      await resolveConsoleRoot(tmp);
    } catch (e) {
      threw = e instanceof Error && /not found/i.test(e.message);
    }
    expect(threw).toBe(true);
  });
});

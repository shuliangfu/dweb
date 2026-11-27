/**
 * App.shutdown() 在未加载客户端构建器时不应再 import csr-client-builder。
 *
 * 生产 `--start` 包不含该模块；若仍按 import.meta.url 解析相对路径，
 * 会变成应用目录下的 feature/csr-client-builder.ts 并报 Module not found。
 *
 * @module
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  deleteEnv,
  getEnv,
  makeTempDir,
  remove,
  setEnv,
} from "@dreamer/runtime-adapter";
import { App } from "../../src/core/app.ts";
import {
  DWEB_LAZY_MODULES_KEY,
  registerDwebLazyModules,
} from "../../src/utils/import-later.ts";

const CSR_CLIENT_BUILDER_SPECIFIER = ["..", "feature", "csr-client-builder.ts"]
  .join("/");

/** 与 e2e / prod-start-listen（39811–39812）及保留口错开 */
const SHUTDOWN_TEST_PORT = 39821;

describe("App.shutdown() client builder cleanup", () => {
  it("未加载客户端构建器时不应 import csr-client-builder", async () => {
    const g = globalThis as Record<string, unknown>;
    const prevRegistry = g[DWEB_LAZY_MODULES_KEY];
    const prevRuntime = getEnv("RUNTIME_ENV");
    let imported = false;
    let routesDir: string | undefined;
    let app: App | undefined;
    try {
      // Bun 的 router 在 routesDir 不存在时会抛错；Deno 则可能放行。
      // 提供一个真实的空路由目录，让 start() 在两种运行时都能进入 stop/shutdown。
      routesDir = await makeTempDir({ prefix: "dweb-shutdown-routes-" });
      setEnv("RUNTIME_ENV", "start");
      registerDwebLazyModules({
        [CSR_CLIENT_BUILDER_SPECIFIER]: () => {
          imported = true;
          return Promise.reject(
            new Error(
              "csr-client-builder should not be imported on shutdown when never loaded",
            ),
          );
        },
      });
      app = new App({
        name: "shutdown-skip-builder",
        kind: "api",
        hotReload: false,
        server: { port: SHUTDOWN_TEST_PORT, host: "127.0.0.1" },
        router: { routesDir },
        logger: {
          level: "warn",
          format: "text",
          output: { console: "auto" },
        },
      });
      await app.start();
      await app.stop();
      await app.shutdown();
      expect(imported).toBe(false);
    } finally {
      if (app) {
        try {
          await app.stop();
        } catch {
          // already stopped
        }
      }
      if (prevRuntime == null) {
        deleteEnv("RUNTIME_ENV");
      } else {
        setEnv("RUNTIME_ENV", prevRuntime);
      }
      if (prevRegistry === undefined) {
        delete g[DWEB_LAZY_MODULES_KEY];
      } else {
        g[DWEB_LAZY_MODULES_KEY] = prevRegistry;
      }
      if (routesDir) {
        await remove(routesDir, { recursive: true });
      }
    }
  }, {
    timeout: 30_000,
    sanitizeOps: false,
    sanitizeResources: false,
  });
});

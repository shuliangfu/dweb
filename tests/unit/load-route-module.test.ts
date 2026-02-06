/**
 * 路由模块加载测试
 *
 * 测试 src/feature/load-route-module.ts 的功能：
 * - loadRouteModule 加载无 CSS 的路由模块
 * - loadRouteModule 路径穿越时返回 null
 * - clearCssRouteCacheForPath 清除 CSS 缓存
 *
 * 注：含 CSS 导入的模块、临时文件等复杂场景依赖实际文件系统，通过集成测试覆盖。
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  clearCssRouteCacheForPath,
  loadRouteModule,
} from "../../src/feature/load-route-module.ts";

describe("loadRouteModule (load-route-module.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-load-route-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  describe("loadRouteModule()", () => {
    it("应加载项目内的无 CSS 路由模块", async () => {
      const routeDir = join(testDir, "src", "routes");
      await ensureDir(routeDir);
      await writeTextFile(
        join(routeDir, "index.tsx"),
        `export default function Page() { return "Hello"; }`,
      );

      const mod = await loadRouteModule(join(routeDir, "index.tsx"));
      expect(mod).not.toBeNull();
      expect(typeof (mod as { default?: unknown })?.default).toBe("function");
    });

    it("项目外路径应返回 null", async () => {
      const mod = await loadRouteModule("/etc/passwd");
      expect(mod).toBeNull();
    });

    it("不存在的路径应返回 null", async () => {
      const mod = await loadRouteModule(join(testDir, "nonexistent.tsx"));
      expect(mod).toBeNull();
    });

    it("项目外路径应返回 null（可传 logger）", async () => {
      const container = (await import("../../src/core/service.ts")).initializeServiceContainer();
      const config = {};
      (await import("../../src/utils/logger.ts")).initializeLogger(container, config);
      const logger = (await import("../../src/utils/logger.ts")).getLogger(container);
      const mod = await loadRouteModule("/outside/path.ts", { logger });
      expect(mod).toBeNull();
    });
  });

  describe("含 CSS 导入的路由模块", () => {
    it("应能加载含 import css 的模块并剥离 CSS", async () => {
      const routeDir = join(testDir, "src", "routes");
      await ensureDir(routeDir);
      const cssDir = join(routeDir, "assets");
      await ensureDir(cssDir);
      await writeTextFile(join(cssDir, "style.css"), "body { color: red; }");
      await writeTextFile(
        join(routeDir, "with-css.tsx"),
        `import "./assets/style.css";
export default function Page() { return "With CSS"; }`,
      );

      const cssCollected: string[] = [];
      const mod = await loadRouteModule(join(routeDir, "with-css.tsx"), {
        cssCollector: (css) => cssCollected.push(css),
      });

      expect(mod).not.toBeNull();
      expect(typeof (mod as { default?: unknown })?.default).toBe("function");
      expect(cssCollected).toContain("body { color: red; }");
    });
  });

  describe("clearCssRouteCacheForPath()", () => {
    it("应能调用且不抛错", () => {
      expect(() => clearCssRouteCacheForPath("/some/path.tsx")).not.toThrow();
    });
  });
});

/**
 * Hybrid 渲染器测试
 *
 * 测试 src/feature/render-hybrid.ts：
 * - createRendererHybrid 返回渲染函数
 * - API 路由返回 null
 * - loadRouteModule 返回 null 或 pageModule 无 default/Page 时返回 null
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
import type { RouteMatch, Router } from "@dreamer/router";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createRendererHybrid } from "../../src/feature/render-hybrid.ts";
import { initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("Hybrid 渲染器 (render-hybrid.ts)", () => {
  describe("createRendererHybrid()", () => {
    it("应返回函数", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererHybrid(container, router, config);
      expect(typeof renderer).toBe("function");
    });

    it("返回的函数应接受 (ctx, match) 两个参数", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererHybrid(container, router, config);
      expect(renderer.length).toBe(2);
    });

    it("match.isApi 为 true 时应返回 null", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererHybrid(container, router, config);
      const ctx = { url: new URL("http://localhost/api/users") } as never;
      const match = {
        isApi: true,
        route: { fullPath: "/api/users" },
        params: {},
        query: {},
        fullPath: "/api/users",
        meta: {},
      } as unknown as RouteMatch;

      const result = await renderer(ctx, match);
      expect(result).toBeNull();
    });

    it("loadRouteModule 返回 null（路径在项目外）时应返回 null", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererHybrid(container, router, config);
      const ctx = { url: new URL("http://localhost/page") } as never;
      const match = {
        isApi: false,
        route: { fullPath: "/etc/passwd" },
        params: {},
        query: {},
        fullPath: "/page",
        meta: {},
      } as unknown as RouteMatch;

      const result = await renderer(ctx, match);
      expect(result).toBeNull();
    });

    describe("pageModule 无 default/Page 时应返回 null", () => {
      let testDir: string;
      let originalCwd: string;
      let emptyPagePath: string;

      beforeAll(async () => {
        testDir = await makeTempDir({ prefix: "dweb-hybrid-no-page-" });
        originalCwd = cwd();
        chdir(testDir);
        const routeDir = join(testDir, "src", "routes");
        await ensureDir(routeDir);
        emptyPagePath = join(routeDir, "no-page.tsx");
        await writeTextFile(
          emptyPagePath,
          "export const x = 1;", // 无 default，无 Page
        );
      });

      afterAll(async () => {
        chdir(originalCwd);
        await remove(testDir, { recursive: true });
      });

      it("pageModule 存在但无 default 和 Page 时应返回 null", async () => {
        const container = initializeServiceContainer();
        const config: AppConfig = {};
        initializeRender(container, config);

        const router = {
          getSpecialFile: (_name: string) => null,
        } as unknown as Router;

        const renderer = createRendererHybrid(container, router, config);
        const ctx = { url: new URL("http://localhost/page") } as never;
        const match = {
          isApi: false,
          route: { fullPath: emptyPagePath },
          params: {},
          query: {},
          fullPath: "/page",
          meta: {},
        } as unknown as RouteMatch;

        const result = await renderer(ctx, match);
        expect(result).toBeNull();
      });
    });
  });
});

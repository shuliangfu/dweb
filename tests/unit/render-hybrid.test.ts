/**
 * Hybrid 渲染器测试
 *
 * 测试 src/feature/render-hybrid.ts：
 * - createRendererHybrid 返回渲染函数
 * - API 路由返回 null
 */

import type { RouteMatch, Router } from "@dreamer/router";
import { describe, expect, it } from "@dreamer/test";
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
  });
});

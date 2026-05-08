/**
 * CSR 渲染器测试
 *
 * 测试 src/feature/render-csr.ts：
 * - createRendererCSR 返回渲染函数
 * - API 路由返回 null
 */

import "../setup.ts";
import type { RouteMatch, Router } from "@dreamer/router";
import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createRendererCSR } from "../../src/feature/render-csr.ts";
import { initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

/**
 * 注册测试用最小 App 实例，满足渲染器对 `container.get("app")` 的依赖。
 *
 * @param container 服务容器。
 */
function registerMockApp(
  container: ReturnType<typeof initializeServiceContainer>,
) {
  container.registerSingleton("app", () => ({
    name: "test-app",
    version: "0.0.0",
    container,
    stage: "init",
    use() {},
    registerPlugin() {},
    on() {},
    start: async () => {},
    stop: async () => {},
    shutdown: async () => {},
  }));
}

describe("CSR 渲染器 (render-csr.ts)", () => {
  describe("createRendererCSR()", () => {
    it("应返回函数", () => {
      const container = initializeServiceContainer();
      registerMockApp(container);
      const config: AppConfig = { name: "test" };
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererCSR(container, router, config);
      expect(typeof renderer).toBe("function");
    });

    it("应接受 container、router、config 三个参数", () => {
      const container = initializeServiceContainer();
      registerMockApp(container);
      const config: AppConfig = {};
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererCSR(container, router, config);
      expect(renderer.length).toBe(2);
    });

    it("match.isApi 为 true 时应返回 null", async () => {
      const container = initializeServiceContainer();
      registerMockApp(container);
      const config: AppConfig = { name: "test" };
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererCSR(container, router, config);
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

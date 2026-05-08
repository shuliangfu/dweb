/**
 * SSG 渲染器测试
 *
 * 测试 src/feature/render-ssg.ts：
 * - createRendererSSG 返回渲染函数
 * - API 路由返回 null
 * - 生产模式：预渲染文件不存在时应返回 null
 * - pathnameToFile 路径映射（通过行为间接验证）
 * - dev 依赖 SSR，需先注册 render 服务
 */

import "../setup.ts";
import { getEnv, makeTempDir, remove } from "@dreamer/runtime-adapter";
import type { RouteMatch, Router } from "@dreamer/router";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createRendererSSG } from "../../src/feature/render-ssg.ts";
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

describe("SSG 渲染器 (render-ssg.ts)", () => {
  describe("createRendererSSG()", () => {
    it("应返回函数", () => {
      const container = initializeServiceContainer();
      registerMockApp(container);
      /** 显式指定 outputDir，避免 Bun 下 getInferredBuildOutputDirs 因 process.argv 路径段数不符而抛错 */
      const config: AppConfig = {
        render: { ssg: { outputDir: "dist/client" } },
      };
      container.registerSingleton("config", () => config);
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererSSG(container, router, config);
      expect(typeof renderer).toBe("function");
    });

    it("返回的函数应接受 (ctx, match) 两个参数", () => {
      const container = initializeServiceContainer();
      registerMockApp(container);
      /** 显式指定 outputDir，避免 Bun 下 getInferredBuildOutputDirs 因 process.argv 路径段数不符而抛错 */
      const config: AppConfig = {
        render: { ssg: { outputDir: "dist/client" } },
      };
      container.registerSingleton("config", () => config);
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererSSG(container, router, config);
      expect(renderer.length).toBe(2);
    });

    it("match.isApi 为 true 时应返回 null", async () => {
      const container = initializeServiceContainer();
      registerMockApp(container);
      const config: AppConfig = {
        render: { ssg: { outputDir: "dist/client" } },
      };
      container.registerSingleton("config", () => config);
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererSSG(container, router, config);
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

    describe("生产模式读预渲染文件", () => {
      let outputDir: string;

      beforeAll(async () => {
        outputDir = await makeTempDir({ prefix: "dweb-ssg-output-" });
      });

      afterAll(async () => {
        await remove(outputDir, { recursive: true });
      });

      it("预渲染文件不存在时应返回 null（prod 模式）", async () => {
        const isDev = getEnv("RUNTIME_ENV") === "dev";
        if (isDev) return; // 开发环境走 SSR，跳过

        const container = initializeServiceContainer();
        registerMockApp(container);
        const config: AppConfig = {
          render: { ssg: { outputDir } },
        };
        container.registerSingleton("config", () => config);
        initializeRender(container, config);

        const router = {
          getSpecialFile: (_name: string) => null,
        } as unknown as Router;

        const renderer = createRendererSSG(container, router, config);
        const ctx = {
          url: new URL("http://localhost/nonexistent-page"),
          path: "/nonexistent-page",
        } as never;
        const match = {
          isApi: false,
          route: { fullPath: "/nonexistent-page", path: "/nonexistent-page" },
          params: {},
          query: {},
          fullPath: "/nonexistent-page",
          meta: {},
        } as unknown as RouteMatch;

        const result = await renderer(ctx, match);
        expect(result).toBeNull();
      });
    });
  });
});

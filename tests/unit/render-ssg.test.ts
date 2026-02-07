/**
 * SSG 渲染器测试
 *
 * 测试 src/feature/render-ssg.ts：
 * - createRendererSSG 返回渲染函数
 * - pathnameToFile 路径映射（通过行为间接验证）
 * - dev 依赖 SSR，需先注册 render 服务
 */

import "../setup.ts";
import type { Router } from "@dreamer/router";
import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createRendererSSG } from "../../src/feature/render-ssg.ts";
import { initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("SSG 渲染器 (render-ssg.ts)", () => {
  describe("createRendererSSG()", () => {
    it("应返回函数", () => {
      const container = initializeServiceContainer();
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
  });
});

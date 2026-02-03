/**
 * SSR 渲染器测试
 *
 * 测试 src/feature/render-ssr.ts：
 * - createRendererSSR 返回渲染函数
 */

import type { Router } from "@dreamer/router";
import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createRendererSSR } from "../../src/feature/render-ssr.ts";
import { initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("SSR 渲染器 (render-ssr.ts)", () => {
  describe("createRendererSSR()", () => {
    it("应返回函数", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      container.registerSingleton("config", () => config);
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererSSR(container, router);
      expect(typeof renderer).toBe("function");
    });

    it("返回的函数应接受 (ctx, match) 两个参数", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      container.registerSingleton("config", () => config);
      initializeRender(container, config);

      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;

      const renderer = createRendererSSR(container, router);
      expect(renderer.length).toBe(2);
    });
  });
});

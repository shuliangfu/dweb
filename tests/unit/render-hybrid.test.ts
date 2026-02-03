/**
 * Hybrid 渲染器测试
 *
 * 测试 src/feature/render-hybrid.ts：
 * - createRendererHybrid 返回渲染函数
 */

import type { Router } from "@dreamer/router";
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
  });
});

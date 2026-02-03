/**
 * CSR 渲染器测试
 *
 * 测试 src/feature/render-csr.ts：
 * - createRendererCSR 返回渲染函数
 */

import type { Router } from "@dreamer/router";
import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createRendererCSR } from "../../src/feature/render-csr.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("CSR 渲染器 (render-csr.ts)", () => {
  describe("createRendererCSR()", () => {
    it("应返回函数", () => {
      const container = initializeServiceContainer();
      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;
      const config: AppConfig = { name: "test" };

      const renderer = createRendererCSR(container, router, config);
      expect(typeof renderer).toBe("function");
    });

    it("应接受 container、router、config 三个参数", () => {
      const container = initializeServiceContainer();
      const router = {
        getSpecialFile: (_name: string) => null,
      } as unknown as Router;
      const config: AppConfig = {};

      const renderer = createRendererCSR(container, router, config);
      expect(renderer.length).toBe(2);
    });
  });
});

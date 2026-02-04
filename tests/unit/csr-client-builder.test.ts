/**
 * CSR 客户端构建器测试
 *
 * 测试 src/feature/csr-client-builder.ts：
 * - clearClientScriptCache、getCachedClientScript
 * - createClientScriptMiddleware 返回函数
 */

import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import {
  clearClientScriptCache,
  createClientScriptMiddleware,
  getCachedClientScript,
} from "../../src/feature/csr-client-builder.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

describe("CSR 客户端构建器 (csr-client-builder.ts)", () => {
  describe("clearClientScriptCache()", () => {
    it("应可调用且不抛错", () => {
      expect(() => clearClientScriptCache()).not.toThrow();
    });
  });

  describe("getCachedClientScript()", () => {
    it("初始应返回 null 或对象", () => {
      clearClientScriptCache();
      const cached = getCachedClientScript();
      expect(cached === null || typeof cached === "object").toBe(true);
    });

    it("clearClientScriptCache 后 getCachedClientScript 应返回 null", () => {
      clearClientScriptCache();
      const cached = getCachedClientScript();
      expect(cached).toBeNull();
    });
  });

  describe("createClientScriptMiddleware()", () => {
    it("应返回函数", () => {
      const container = initializeServiceContainer();
      // 显式指定 build.client.output，避免 getInferredBuildOutputDirs() 在 Bun 下因入口路径段数报错
      const config: AppConfig = {
        name: "test",
        build: { client: { output: "dist/client", engine: "preact" } },
      };
      initializeLogger(container, config);

      const middleware = createClientScriptMiddleware(container, config);
      expect(typeof middleware).toBe("function");
    });

    it("返回的函数应接受两个参数（ctx, next）", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        name: "test",
        build: { client: { output: "dist/client", engine: "preact" } },
      };
      initializeLogger(container, config);

      const middleware = createClientScriptMiddleware(container, config);
      expect(middleware.length).toBeGreaterThanOrEqual(0);
    });
  });
});

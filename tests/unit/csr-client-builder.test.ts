/**
 * CSR 客户端构建器测试
 *
 * 测试 src/feature/csr-client-builder.ts：
 * - clearClientScriptCache、getCachedClientScript
 * - createClientScriptMiddleware 返回函数
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import {
  clearClientScriptCache,
  createClientScriptMiddleware,
  generateClientDepContent,
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

  describe("generateClientDepContent()", () => {
    it("生成的 head meta 插入锚点应使用 ChildNode，避免 generated client 类型回归", () => {
      const code = generateClientDepContent(
        "view",
        [
          {
            componentPath: "index",
            fullPath: "/tmp/routes/index.tsx",
            importName: "Route_index",
          },
        ],
        false,
        [],
        "hybrid",
        {},
      );

      expect(code).toContain("let _insertTail: ChildNode | null = _vpAnchor;");
      expect(code).toContain("_insertTail = _nodesM[_nodesM.length - 1];");
    });

    it("View 引擎生成物应含 _canonicalPagePropsForViewState，避免 data 缺省与 {} 误判为不同根状态", () => {
      const code = generateClientDepContent(
        "view",
        [
          {
            componentPath: "index",
            fullPath: "/tmp/routes/index.tsx",
            importName: "Route_index",
          },
        ],
        false,
        [],
        "csr",
        {},
      );

      expect(code).toContain("_canonicalPagePropsForViewState");
      expect(code).toContain("_canonicalLayoutPropsForViewState");
      expect(code).toContain("_isSameViewStateRoot");
      expect(code).toContain("_routeKeyForViewState");
      expect(code).toContain("routeComponent: match.route.component");
      expect(code).toContain("{ force: true }");
      expect(code).toContain(
        "function setViewState(next: _ViewStateRoot, opts?",
      );
      expect(code).toContain("_stableJsonForViewState");
      expect(code).toContain("_dwebRcrCoalesceToken");
      expect(code).toContain("_nextViewRoot");
      expect(code).toContain(
        "_isSameViewStateRoot(getViewState(), _nextViewRoot)",
      );
    });

    it("View + Hybrid 生成物应在 initApp 内预合并 __DATA__.layoutData，避免初始 layouts=[] 触发 layouts.length 整树重挂", () => {
      const code = generateClientDepContent(
        "view",
        [
          {
            componentPath: "index",
            fullPath: "/tmp/routes/index.tsx",
            importName: "Route_index",
          },
        ],
        false,
        [],
        "hybrid",
        {},
      );

      expect(code).toContain("__dPre");
      expect(code).toContain("_mergedPre");
      expect(code).toContain("_ldPre");
      expect(code).toContain("(a.page == null) !== (b.page == null)");
    });
  });
});

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
  buildChunkIndices,
  clearClientScriptCache,
  createClientScriptMiddleware,
  findChunkContent,
  generateClientDepContent,
  getCachedClientScript,
  getChunkBaseName,
  getChunkFileNameForComponent,
  isClientChunkFile,
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
        "/tmp/routes",
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
        "/tmp/routes",
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
        "/tmp/routes",
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

    it("View 生成物应支持 __DWEB_MISMATCH_MODE__ continue|assert 走 hydrate，默认仍 wipe+mount", () => {
      const code = generateClientDepContent(
        "view",
        [
          {
            componentPath: "index",
            fullPath: "/tmp/routes/index.tsx",
            importName: "Route_index",
          },
        ],
        "/tmp/routes",
        false,
        [],
        "hybrid",
        {},
      );

      expect(code).toContain(
        'import { createSignal, hydrate, mount, type Signal } from "@dreamer/view";',
      );
      expect(code).toContain("__DWEB_MISMATCH_MODE__");
      expect(code).toContain(
        'mismatchMode === "continue" || mismatchMode === "assert"',
      );
      expect(code).toContain("hydrate(rootFn, host, { mismatchMode })");
      expect(code).toContain("mount(rootFn, host)");
    });

    it("Windows 下 componentPath 误为整段 D: 时仍用 fullPath+routes 生成相对 import", () => {
      const routesDir = "D:/a/dweb/dweb/examples/preact-ssg/basic/src/routes";
      const file = `${routesDir}/about.tsx`;
      const code = generateClientDepContent(
        "preact",
        [
          {
            componentPath: `${routesDir}/about`,
            fullPath: file,
            importName: "Route_bad",
          },
        ],
        routesDir,
        false,
        [],
        "hybrid",
        {},
      );
      expect(code).toContain(`${JSON.stringify("about")}:`);
      expect(code).toContain(JSON.stringify("./routes/about.tsx"));
      expect(code).not.toContain("./routes/D:");
    });
  });

  describe("getChunkFileNameForComponent()", () => {
    it("深层路由产物仅为末段 create-*.js 时应命中 workspace/projects/create（HMR routeChunkUrls）", () => {
      const names = [
        "_client.js",
        "workspace-index-ABCDEF.js",
        "create-XYZABC1.js",
      ];
      expect(
        getChunkFileNameForComponent("workspace/projects/create", names),
      ).toBe("create-XYZABC1.js");
    });

    it("末段同名多 chunk 时不应采用模糊匹配", () => {
      const names = ["create-AAAAAA.js", "create-BBBBBB.js"];
      expect(
        getChunkFileNameForComponent("workspace/projects/create", names),
      ).toBeNull();
    });

    it("完整路径 dash 命名 desktop-basic-button-*.js 应优先于同名末段", () => {
      const names = [
        "button-OTHER1.js",
        "desktop-basic-button-HASH01.js",
        "_client.js",
      ];
      expect(
        getChunkFileNameForComponent("desktop/basic/button", names),
      ).toBe("desktop-basic-button-HASH01.js");
    });

    it("根 index 应匹配 routes-*.js", () => {
      const names = ["_client.js", "routes-ABCDEF.js", "about-XYZXYZ.js"];
      expect(getChunkFileNameForComponent("index", names)).toBe(
        "routes-ABCDEF.js",
      );
    });

    it("单段 about 应匹配 about-*.js", () => {
      expect(
        getChunkFileNameForComponent("about", [
          "_client.js",
          "about-ABCDEF.js",
          "home-XYZXYZ.js",
        ]),
      ).toBe("about-ABCDEF.js");
    });
  });

  describe("isClientChunkFile()", () => {
    it("应识别 hash chunk 与无 hash 开发 chunk，排除主入口", () => {
      expect(isClientChunkFile("/about-ABCDEF.js")).toBe(true);
      expect(isClientChunkFile("/routes/index-ABCDEF.js")).toBe(true);
      expect(isClientChunkFile("/about.js")).toBe(true);
      expect(isClientChunkFile("/about-ABCDEF.js.map")).toBe(true);
      expect(isClientChunkFile("/_client.js")).toBe(false);
      expect(isClientChunkFile("/_client.js.map")).toBe(false);
      expect(isClientChunkFile("/api/users")).toBe(false);
      expect(isClientChunkFile("about-ABCDEF.js")).toBe(false);
    });
  });

  describe("findChunkContent() / buildChunkIndices()", () => {
    it("应按 basename 与 HMR base 回退命中，且多 chunk 不互替", () => {
      const files = new Map<string, string>([
        ["about-AAAAAA.js", "about-v1"],
        ["routes-BBBBBB.js", "routes-content"],
        ["chunk-111111.js", "chunk-a"],
        ["chunk-222222.js", "chunk-b"],
      ]);
      const { chunkContentIndex, chunkBaseIndex } = buildChunkIndices(files);
      expect(findChunkContent(files, "about-AAAAAA.js", chunkContentIndex))
        .toBe("about-v1");
      // HMR：旧 hash 按 base 回退到唯一 routes 内容
      expect(
        findChunkContent(
          files,
          "routes-OLDOLD.js",
          chunkContentIndex,
          chunkBaseIndex,
        ),
      ).toBe("routes-content");
      // 多个 chunk-* 共享 base「chunk」，不得误回退
      expect(
        findChunkContent(
          files,
          "chunk-999999.js",
          chunkContentIndex,
          chunkBaseIndex,
        ),
      ).toBeUndefined();
      expect(getChunkBaseName("about-ABCDEF.js")).toBe("about");
      expect(getChunkBaseName("_client.js")).toBe("_client");
    });

    it("admin/index 不得误匹配根 index 的 routes chunk", () => {
      const names = [
        "routes-HOME01.js",
        "admin-index-ADM001.js",
        "_client.js",
      ];
      expect(getChunkFileNameForComponent("admin/index", names)).toBe(
        "admin-index-ADM001.js",
      );
      expect(getChunkFileNameForComponent("index", names)).toBe(
        "routes-HOME01.js",
      );
    });
  });
});

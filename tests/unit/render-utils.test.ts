/**
 * render-utils 单元测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  collectClientRoutes,
  hasContainerElementInHtml,
  MountContainerMissingError,
  streamAfterMountContainer,
  wrapInlineClientBootstrapScript,
} from "../../src/feature/render-utils.ts";

describe("render-utils", () => {
  describe("hasContainerElementInHtml()", () => {
    it("应匹配标签 id 属性", () => {
      expect(hasContainerElementInHtml(`<div id="app"></div>`, "app")).toBe(
        true,
      );
      expect(hasContainerElementInHtml(`<main id='root' class="x">`, "root"))
        .toBe(true);
    });

    it("不应匹配 script 正文中的 id 字符串", () => {
      const html =
        `<html><body><script>const s = 'id="app"';</script></body></html>`;
      expect(hasContainerElementInHtml(html, "app")).toBe(false);
    });

    it("id 不同应返回 false", () => {
      expect(hasContainerElementInHtml(`<div id="other"></div>`, "app")).toBe(
        false,
      );
    });
  });

  describe("streamAfterMountContainer()", () => {
    async function readStream(
      stream: ReadableStream<Uint8Array>,
    ): Promise<string> {
      return await new Response(stream).text();
    }

    function chunked(
      html: string,
      chunkSize: number,
    ): ReadableStream<Uint8Array> {
      const bytes = new TextEncoder().encode(html);
      return new ReadableStream({
        start(controller) {
          for (let i = 0; i < bytes.length; i += chunkSize) {
            controller.enqueue(bytes.subarray(i, i + chunkSize));
          }
          controller.close();
        },
      });
    }

    it("容器被切在两个 chunk 时仍原样输出", async () => {
      const html =
        `<html><head></head><body><div id="app"><p>hi</p></div></body></html>`;
      const out = await streamAfterMountContainer(chunked(html, 1), "app");
      expect(await readStream(out)).toBe(html);
    });

    it("script 正文里的 id 不算挂载容器", async () => {
      const html =
        `<html><body><script>const s = 'id="app"';</script></body></html>`;
      try {
        await streamAfterMountContainer(chunked(html, 3), "app");
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(MountContainerMissingError);
      }
    });

    it("没有容器时抛出，且带已读长度", async () => {
      const html = `<html><body><div id="other"></div></body></html>`;
      try {
        await streamAfterMountContainer(chunked(html, 4), "app");
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(MountContainerMissingError);
        expect((err as MountContainerMissingError).htmlLength).toBe(
          html.length,
        );
      }
    });
  });

  describe("collectClientRoutes()", () => {
    it("应跳过 API 路由并规范化 component", () => {
      const router = {
        getRoutes: () => [
          {
            path: "/",
            file: "/proj/src/routes/index.tsx",
            type: "static",
          },
          {
            path: "/api/users",
            file: "/proj/src/routes/api/users.ts",
            isApi: true,
          },
          {
            path: "/about",
            file: "/proj/src/routes/about.tsx",
          },
        ],
      };
      const routes = collectClientRoutes(
        router as never,
        "/proj/src/routes",
      );
      expect(routes.length).toBe(2);
      expect(routes.map((r) => r.path).sort()).toEqual(["/", "/about"]);
      expect(routes.find((r) => r.path === "/")?.component).toBe("index");
      expect(routes.find((r) => r.path === "/about")?.component).toBe("about");
      expect(routes.every((r) => r.type)).toBe(true);
    });

    it("无 getRoutes 时应返回空数组", () => {
      expect(collectClientRoutes({} as never, "/routes")).toEqual([]);
    });
  });

  describe("wrapInlineClientBootstrapScript()", () => {
    const statements = [
      'globalThis.__DATA__ = {"page":1};',
      "globalThis.__DWEB_DEV__ = false;",
      'globalThis.__DWEB_MODE__ = "hybrid";',
    ];

    it("生产应去注释并紧凑单行，且不改语句内 JSON", () => {
      const out = wrapInlineClientBootstrapScript(statements, {
        isDev: false,
        leadingComments: { 0: "Hydration 数据", 1: "客户端路由配置" },
      });
      expect(out.startsWith("<script>")).toBe(true);
      expect(out.endsWith("</script>")).toBe(true);
      expect(out.includes("//")).toBe(false);
      expect(out.includes("\n")).toBe(false);
      expect(out).toContain('globalThis.__DATA__ = {"page":1};');
      expect(out).toContain("globalThis.__DWEB_DEV__ = false;");
      expect(out).toBe(
        '<script>globalThis.__DATA__ = {"page":1};globalThis.__DWEB_DEV__ = false;globalThis.__DWEB_MODE__ = "hybrid";</script>',
      );
    });

    it("开发应保留换行与 leadingComments", () => {
      const out = wrapInlineClientBootstrapScript(statements, {
        isDev: true,
        leadingComments: { 0: "Hydration 数据", 1: "客户端路由配置" },
      });
      expect(out).toContain("// Hydration 数据");
      expect(out).toContain("// 客户端路由配置");
      expect(out).toContain("\n");
      expect(out).toContain('  globalThis.__DATA__ = {"page":1};');
    });

    it("应跳过空语句且 leadingComments 按下标对齐", () => {
      const out = wrapInlineClientBootstrapScript(
        ["", 'globalThis.__DATA__ = {"a":1};', ""],
        { isDev: true, leadingComments: { 1: "Hydration 数据" } },
      );
      expect(out).toContain("// Hydration 数据");
      expect(out).toContain('globalThis.__DATA__ = {"a":1};');
    });
  });
});

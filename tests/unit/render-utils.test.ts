/**
 * render-utils 单元测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  collectClientRoutes,
  hasContainerElementInHtml,
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
});

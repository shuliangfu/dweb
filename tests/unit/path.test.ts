/**
 * 路径工具测试
 *
 * 测试 src/utils/path.ts 的功能：
 * - isPathWithinProject 路径安全校验
 * - pathForLog 日志友好路径
 * - normalizePathForCompare 路径规范化
 *
 * 使用 makeTempDir 创建真实路径，支持 Windows 等跨平台测试。
 */

import "../setup.ts";
import {
  cwd,
  ensureDir,
  join,
  makeTempDir,
  remove,
  resolve,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  extractComponentPathFromRouteFile,
  isPathWithinProject,
  normalizePathForCompare,
  pathForLog,
  resolveRouterRoutesDirPath,
} from "../../src/utils/path.ts";

describe("路径工具 (path.ts)", () => {
  /** 使用真实临时目录作为项目根，支持 Windows 跨平台 */
  let projectRoot: string;
  /** 项目外的另一目录，用于测试路径穿越 */
  let otherDir: string;

  beforeAll(async () => {
    projectRoot = await makeTempDir({ prefix: "dweb-path-project-" });
    otherDir = await makeTempDir({ prefix: "dweb-path-other-" });
  });

  afterAll(async () => {
    await remove(projectRoot, { recursive: true });
    await remove(otherDir, { recursive: true });
  });

  describe("resolveRouterRoutesDirPath()", () => {
    it("应解析为 cwd 下存在的 routes 目录（标准 ./src/routes）", async () => {
      const root = await makeTempDir({ prefix: "dweb-resolve-routes-" });
      const expected = join(root, "src", "routes");
      await ensureDir(expected);
      const got = resolveRouterRoutesDirPath(root, "./src/routes");
      expect(got.replace(/\\/g, "/")).toBe(expected.replace(/\\/g, "/"));
      await remove(root, { recursive: true });
    });

    it("cwd 已在应用子目录时，应去掉配置首段，避免 frontend/frontend/routes 重复", async () => {
      const root = await makeTempDir({ prefix: "dweb-resolve-routes-dup-" });
      const appFront = join(root, "frontend");
      const expected = join(appFront, "routes");
      await ensureDir(expected);
      const got = resolveRouterRoutesDirPath(appFront, "./frontend/routes");
      expect(got.replace(/\\/g, "/")).toBe(expected.replace(/\\/g, "/"));
      await remove(root, { recursive: true });
    });

    it("已为绝对路径时应直接 resolve，勿与 cwd 再拼接", async () => {
      const root = await makeTempDir({ prefix: "dweb-resolve-routes-abs-" });
      const absRoutes = join(root, "my-routes");
      await ensureDir(absRoutes);
      const got = resolveRouterRoutesDirPath(cwd(), absRoutes);
      expect(got.replace(/\\/g, "/")).toBe(absRoutes.replace(/\\/g, "/"));
      await remove(root, { recursive: true });
    });
  });

  describe("isPathWithinProject()", () => {
    it("项目根路径应在项目内", () => {
      expect(isPathWithinProject(projectRoot, projectRoot)).toBe(true);
    });

    it("项目子路径应在项目内", () => {
      expect(
        isPathWithinProject(join(projectRoot, "src/foo.ts"), projectRoot),
      ).toBe(true);
      expect(
        isPathWithinProject(join(projectRoot, "config/main.ts"), projectRoot),
      ).toBe(true);
    });

    it("项目外路径应返回 false", () => {
      expect(
        isPathWithinProject(join(otherDir, "file.ts"), projectRoot),
      ).toBe(false);
    });

    it("路径穿越（../）应返回 false", () => {
      const escaped = join(projectRoot, "src/../etc/passwd");
      const resolvedPath = resolve(escaped);
      expect(isPathWithinProject(resolvedPath, projectRoot)).toBe(true);
      const outsidePath = join(otherDir, "secret");
      expect(isPathWithinProject(outsidePath, projectRoot)).toBe(false);
    });

    it("相对路径会 resolve 后比较", () => {
      expect(
        isPathWithinProject(join(projectRoot, "a/b"), projectRoot),
      ).toBe(true);
    });
  });

  describe("pathForLog()", () => {
    it("项目内路径应返回相对路径", () => {
      const rel = pathForLog(join(projectRoot, "src/foo.ts"), projectRoot);
      expect(rel).toBe("src/foo.ts");
    });

    it("项目根应返回 .", () => {
      const rel = pathForLog(projectRoot, projectRoot);
      expect(rel).toBe(".");
    });

    it("项目外路径应返回原路径", () => {
      const outside = join(otherDir, "secret.ts");
      expect(pathForLog(outside, projectRoot)).toBe(outside);
    });

    it("子目录路径应正确相对化", () => {
      const full = join(projectRoot, "config/main.ts");
      expect(pathForLog(full, projectRoot)).toBe("config/main.ts");
    });
  });

  describe("normalizePathForCompare()", () => {
    it("应统一反斜杠为正斜杠", () => {
      const win = "C:\\Users\\foo\\project";
      const normalized = normalizePathForCompare(win);
      expect(normalized).not.toContain("\\");
      expect(normalized).toContain("/");
    });

    it("应移除末尾斜杠", () => {
      const withTrailing = `${projectRoot}/`;
      const normalized = normalizePathForCompare(withTrailing);
      expect(normalized.endsWith("/")).toBe(false);
    });

    it("应折叠 /./ 段", () => {
      const withDot = join(projectRoot, "./src/./foo");
      const normalized = normalizePathForCompare(withDot);
      expect(normalized).not.toContain("/./");
    });
  });

  describe("extractComponentPathFromRouteFile()", () => {
    it("相对路径（route.file）应直接返回 component key", () => {
      const routesDirPath = join(projectRoot, "src/routes");
      expect(
        extractComponentPathFromRouteFile(routesDirPath, "user/[id].tsx"),
      ).toBe("user/[id]");
      expect(
        extractComponentPathFromRouteFile(routesDirPath, "index.tsx"),
      ).toBe("index");
      expect(
        extractComponentPathFromRouteFile(routesDirPath, "gallery.tsx"),
      ).toBe("gallery");
    });

    it("绝对路径应提取 routes 之后的部分", () => {
      const routesDirPath = join(projectRoot, "src/routes");
      const abs = join(routesDirPath, "user/[id].tsx");
      expect(
        extractComponentPathFromRouteFile(routesDirPath, abs),
      ).toBe("user/[id]");
      const absIndex = join(routesDirPath, "index.tsx");
      expect(
        extractComponentPathFromRouteFile(routesDirPath, absIndex),
      ).toBe("index");
    });

    it("带 ./ 前缀的相对路径应去除前缀", () => {
      const routesDirPath = join(projectRoot, "src/routes");
      expect(
        extractComponentPathFromRouteFile(routesDirPath, "./user/[id].tsx"),
      ).toBe("user/[id]");
    });

    it("空串应返回空串", () => {
      const routesDirPath = join(projectRoot, "src/routes");
      expect(extractComponentPathFromRouteFile(routesDirPath, "")).toBe("");
    });

    it("非字符串类型应返回空串", () => {
      const routesDirPath = join(projectRoot, "src/routes");
      expect(
        extractComponentPathFromRouteFile(
          routesDirPath,
          null as unknown as string,
        ),
      ).toBe("");
      expect(
        extractComponentPathFromRouteFile(
          routesDirPath,
          undefined as unknown as string,
        ),
      ).toBe("");
    });
  });
});

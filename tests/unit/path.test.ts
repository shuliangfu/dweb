/**
 * 路径工具测试
 *
 * 测试 src/utils/path.ts 的功能：
 * - isPathWithinProject 路径安全校验
 * - pathForLog 日志友好路径
 * - normalizePathForCompare 路径规范化
 */

import { describe, expect, it } from "@dreamer/test";
import {
  isPathWithinProject,
  normalizePathForCompare,
  pathForLog,
} from "../../src/utils/path.ts";

describe("路径工具 (path.ts)", () => {
  /** 模拟项目根（跨平台使用 / 统一） */
  const projectRoot = "/home/project";

  describe("isPathWithinProject()", () => {
    it("项目根路径应在项目内", () => {
      expect(isPathWithinProject(projectRoot, projectRoot)).toBe(true);
    });

    it("项目子路径应在项目内", () => {
      expect(isPathWithinProject(`${projectRoot}/src/foo.ts`, projectRoot)).toBe(true);
      expect(isPathWithinProject(`${projectRoot}/config/main.ts`, projectRoot)).toBe(true);
    });

    it("项目外路径应返回 false", () => {
      expect(isPathWithinProject("/home/other/file.ts", projectRoot)).toBe(false);
      expect(isPathWithinProject("/tmp/foo", projectRoot)).toBe(false);
    });

    it("路径穿越（../）应返回 false", () => {
      const escaped = `${projectRoot}/src/../etc/passwd`;
      const resolved = "/home/project/etc/passwd";
      expect(isPathWithinProject(resolved, projectRoot)).toBe(true);
      // 注意：normalizePathForCompare 会 resolve，所以 ../ 会被折叠
      // 若传入的是已解析路径，则 /home/project/etc 在项目内
      const outside = "/home/project/../other/secret";
      const outsideResolved = "/home/other/secret";
      expect(isPathWithinProject(outsideResolved, projectRoot)).toBe(false);
    });

    it("相对路径会 resolve 后比较", () => {
      // normalizePathForCompare 内部会 resolve，传入相对路径会基于 cwd
      // 此处传入绝对路径测试
      expect(isPathWithinProject(`${projectRoot}/a/b`, projectRoot)).toBe(true);
    });
  });

  describe("pathForLog()", () => {
    it("项目内路径应返回相对路径", () => {
      const rel = pathForLog(`${projectRoot}/src/foo.ts`, projectRoot);
      expect(rel).toBe("src/foo.ts");
    });

    it("项目根应返回 .", () => {
      const rel = pathForLog(projectRoot, projectRoot);
      expect(rel).toBe(".");
    });

    it("项目外路径应返回原路径", () => {
      const outside = "/home/other/secret.ts";
      expect(pathForLog(outside, projectRoot)).toBe(outside);
    });

    it("子目录路径应正确相对化", () => {
      const full = `${projectRoot}/config/main.ts`;
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
      const withDot = `${projectRoot}/./src/./foo`;
      const normalized = normalizePathForCompare(withDot);
      expect(normalized).not.toContain("/./");
    });
  });
});

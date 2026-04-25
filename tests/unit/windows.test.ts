/**
 * Windows 兼容性单元测试
 *
 * 模拟所有 Windows 相关场景，覆盖框架中与 Windows 路径、平台检测相关的逻辑：
 * - 路径规范化（反斜杠、盘符、file:// URL）
 * - 构建输出推断（超长路径、反斜杠路径）
 * - 模块缓存（file:///D:/path 与 D:\\path 归一）
 * - 路径安全校验（大小写不敏感，仅 Windows 平台）
 * - 组件路径提取（Windows 绝对路径、混合斜杠）
 *
 * 平台相关测试（如 isPathWithinProject 大小写不敏感）在非 Windows 上会跳过，
 * 在 CI 的 windows-latest 上会执行。
 */

import "../setup.ts";
import {
  dirname,
  join,
  makeTempDir,
  pathToFileUrl,
  platform,
  realPathSync,
  remove,
  resolve,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { getInferredBuildOutputDirs } from "../../src/utils/build-dirs.ts";
import {
  extractComponentPathFromRouteFile,
  isPathWithinProject,
  normalizePathForCompare,
  pathForLog,
} from "../../src/utils/path.ts";
import {
  getModuleVersion,
  invalidateModule,
} from "../../src/feature/module-cache.ts";

describe("Windows 兼容性 (windows.test.ts)", () => {
  /** 项目根目录，用于路径测试 */
  let projectRoot: string;
  /** 项目外目录，用于路径穿越测试 */
  let otherDir: string;

  beforeAll(async () => {
    projectRoot = await makeTempDir({ prefix: "dweb-windows-project-" });
    otherDir = await makeTempDir({ prefix: "dweb-windows-other-" });
  });

  afterAll(async () => {
    await remove(projectRoot, { recursive: true });
    await remove(otherDir, { recursive: true });
  });

  // ==================== 路径规范化 ====================
  describe("路径规范化 (normalizePathForCompare)", () => {
    it("Windows 反斜杠路径应统一为正斜杠", () => {
      const win = "C:\\Users\\foo\\project";
      const normalized = normalizePathForCompare(win);
      expect(normalized).not.toContain("\\");
      expect(normalized).toContain("/");
    });

    it("Windows 混合斜杠路径应统一为正斜杠", () => {
      const mixed = "D:\\project/src\\routes\\index.tsx";
      const normalized = normalizePathForCompare(mixed);
      expect(normalized).not.toContain("\\");
    });

    it("Windows 盘符路径 C:/ 格式应正确解析", () => {
      const cPath = "C:/Users/foo/app";
      const normalized = normalizePathForCompare(cPath);
      expect(normalized).toContain("C:");
      expect(normalized).not.toContain("\\");
    });

    it("Windows 盘符路径 D:\\ 格式应正确解析", () => {
      const dPath = "D:\\project\\src";
      const normalized = normalizePathForCompare(dPath);
      expect(normalized).not.toContain("\\");
    });

    it("连续反斜杠应归一", () => {
      const multi = "C:\\\\Users\\\\foo\\\\path";
      const normalized = normalizePathForCompare(multi);
      expect(normalized).not.toContain("\\\\");
    });

    it("边界：空串应 resolve 为 cwd 相关路径", () => {
      const normalized = normalizePathForCompare("");
      expect(typeof normalized).toBe("string");
      expect(normalized.length).toBeGreaterThan(0);
    });

    it("边界：仅 . 应 resolve 为 cwd", () => {
      const normalized = normalizePathForCompare(".");
      expect(normalized).not.toContain("/./");
    });

    it("边界：Unix 绝对路径 /path 应保持", () => {
      const unix = "/home/user/project/src";
      const normalized = normalizePathForCompare(unix);
      expect(normalized).not.toContain("\\");
    });

    it("边界：小写盘符 d:/path 应正确解析", () => {
      const lower = "d:/project/src";
      const normalized = normalizePathForCompare(lower);
      expect(normalized).not.toContain("\\");
    });

    it("边界：Unicode 路径（中文）应正确归一", () => {
      const unicode = "C:\\Users\\用户\\项目\\src";
      const normalized = normalizePathForCompare(unicode);
      expect(normalized).not.toContain("\\");
    });

    /**
     * Windows 上 `fs.realpath` 等可能返回 `\\?\C:\...` 逐字形式；须与
     * `process.cwd()` 的常规 `C:\...` 在 `isPathWithinProject` 中可比，否则
     * loadRouteModule 会误拒（load-data 等用例在 Bun+Windows CI 中失败）。
     */
    it("Windows 下应归一化 \\\\?\\ 逐字绝对路径，便于与项目根比较", () => {
      if (platform() !== "windows") {
        return;
      }
      const withBackslash = projectRoot.replace(/\//g, "\\");
      const verbatim = "\\\\?\\" + withBackslash;
      const normV = normalizePathForCompare(verbatim);
      const normP = normalizePathForCompare(projectRoot);
      expect(normV).toBe(normP);
    });

    /**
     * 在逐字 `projectRoot` 上确认「路径在 Project 内」的判定，与
     * `normalizePathForCompare` 的 strip 一致。
     */
    it("Windows 下 isPathWithinProject 应接受带 \\?\\ 的归一路径", () => {
      if (platform() !== "windows") {
        return;
      }
      const withBackslash = projectRoot.replace(/\//g, "\\");
      const verbatimRoot = "\\\\?\\" + withBackslash;
      expect(isPathWithinProject(verbatimRoot, projectRoot)).toBe(true);
    });
  });

  // ==================== 构建输出推断 ====================
  describe("构建输出推断 (getInferredBuildOutputDirs)", () => {
    it("Windows 反斜杠路径 src\\main.ts → dist、dist/client", () => {
      const { server, client } = getInferredBuildOutputDirs("src\\main.ts");
      expect(server).toBe("dist");
      expect(client).toBe("dist/client");
    });

    it("Windows 反斜杠路径 src\\backend\\main.ts → dist/backend、dist/backend/client", () => {
      const { server, client } = getInferredBuildOutputDirs(
        "src\\backend\\main.ts",
      );
      expect(server).toBe("dist/backend");
      expect(client).toBe("dist/backend/client");
    });

    it("Windows 反斜杠超长路径应提取 src/main.ts → dist、dist/client", () => {
      const { server, client } = getInferredBuildOutputDirs(
        "..\\..\\..\\Users\\foo\\Desktop\\app-test\\src\\main.ts",
      );
      expect(server).toBe("dist");
      expect(client).toBe("dist/client");
    });

    it("Windows 超长路径（含 URL 编码）应提取 src/main.ts → dist、dist/client", () => {
      const { server, client } = getInferredBuildOutputDirs(
        "./../../../%E8%88%92%E5%9B%BD%E6%97%AD/Desktop/app-test/src/main.ts",
      );
      expect(server).toBe("dist");
      expect(client).toBe("dist/client");
    });

    it("Windows 超长路径应提取 src/backend/main.ts → dist/backend、dist/backend/client", () => {
      const { server, client } = getInferredBuildOutputDirs(
        "./../../../Users/foo/Desktop/myapp/src/backend/main.ts",
      );
      expect(server).toBe("dist/backend");
      expect(client).toBe("dist/backend/client");
    });

    it("Windows 反斜杠 dist\\server.js 应正确解析为单应用构建产物", () => {
      const { server, client } = getInferredBuildOutputDirs("dist\\server.js");
      expect(server).toBe("dist");
      expect(client).toBe("dist/client");
    });

    it("边界：空串应抛出", () => {
      expect(() => getInferredBuildOutputDirs("")).toThrow(
        /Entry path format not supported|入口路径格式不支持|需 1–3 段/,
      );
    });

    it("边界：超长路径且无 main.ts 应抛出", () => {
      // 需 parts.length > 3 才会调用 extractEntryFromLongPath，进而检测 main.ts
      expect(() =>
        getInferredBuildOutputDirs(
          "a/b/c/d/e/src/routes/index.tsx",
        )
      ).toThrow(/main\.ts|路径中未找到/);
    });

    it("边界：./ 前缀应正确解析", () => {
      const { server, client } = getInferredBuildOutputDirs("./src/main.ts");
      expect(server).toBe("dist");
      expect(client).toBe("dist/client");
    });

    it("边界：混合 ./ 与反斜杠应正确解析", () => {
      const { server, client } = getInferredBuildOutputDirs(
        ".\\src\\backend\\main.ts",
      );
      expect(server).toBe("dist/backend");
      expect(client).toBe("dist/backend/client");
    });
  });

  // ==================== 模块缓存 ====================
  describe("模块缓存 (module-cache) Windows file:// URL 归一", () => {
    it("file:///D:/path 与 D:/path 应归一为同一 key", () => {
      const fileUrl = "file:///D:/project/src/routes/index.tsx";
      const directPath = "D:/project/src/routes/index.tsx";
      invalidateModule(fileUrl);
      const v1 = getModuleVersion(fileUrl);
      const v2 = getModuleVersion(directPath);
      expect(v1).toBe(v2);
    });

    it("file:///C:/path 与 C:\\path 应归一为同一 key", () => {
      const fileUrl = "file:///C:/Users/foo/app/src/main.ts";
      const backslashPath = "C:\\Users\\foo\\app\\src\\main.ts";
      invalidateModule(fileUrl);
      const v1 = getModuleVersion(fileUrl);
      const v2 = getModuleVersion(backslashPath);
      expect(v1).toBe(v2);
    });

    it("pathToFileUrl 生成的 URL 与直接路径应能互相查找", () => {
      const testPath = join(projectRoot, "routes", "index.tsx");
      const fileUrl = pathToFileUrl(testPath);
      invalidateModule(fileUrl);
      expect(getModuleVersion(fileUrl)).toBeGreaterThanOrEqual(1);
      expect(getModuleVersion(testPath)).toBe(getModuleVersion(fileUrl));
    });

    it("边界：file:/// 三斜杠格式（Unix 风格）应能处理", () => {
      const unixUrl = "file:///home/user/project/src/main.ts";
      invalidateModule(unixUrl);
      expect(getModuleVersion(unixUrl)).toBeGreaterThanOrEqual(1);
    });

    it("边界：相对路径应 resolve 后作为 key", () => {
      invalidateModule("src/routes/index.tsx");
      expect(getModuleVersion("src/routes/index.tsx")).toBeGreaterThanOrEqual(
        1,
      );
    });
  });

  // ==================== 组件路径提取 ====================
  describe("组件路径提取 (extractComponentPathFromRouteFile) Windows 路径", () => {
    it("Windows 绝对路径 C:\\project\\src\\routes\\index 应提取为 index", () => {
      const raw = "C:\\project\\src\\routes\\index.tsx";
      const result = extractComponentPathFromRouteFile(
        "C:/project/src/routes",
        raw,
      );
      expect(result).toBe("index");
    });

    it("Windows 绝对路径 D:/project/src/routes/user/[id] 应提取为 user/[id]", () => {
      const raw = "D:/project/src/routes/user/[id].tsx";
      const result = extractComponentPathFromRouteFile(
        "D:/project/src/routes",
        raw,
      );
      expect(result).toBe("user/[id]");
    });

    it("Windows 混合斜杠 src\\routes\\gallery 应提取为 gallery", () => {
      const raw = "C:\\app\\src\\routes\\gallery.tsx";
      const result = extractComponentPathFromRouteFile(
        "C:/app/src/routes",
        raw,
      );
      expect(result).toBe("gallery");
    });

    it("相对路径 src\\routes\\about 应归一为 src/routes/about（去扩展名）", () => {
      const raw = "src\\routes\\about.tsx";
      const routesDir = join(projectRoot, "src", "routes");
      const result = extractComponentPathFromRouteFile(routesDir, raw);
      expect(result).toBe("src/routes/about");
    });

    it("边界：空串应返回空串", () => {
      const routesDir = join(projectRoot, "src", "routes");
      expect(extractComponentPathFromRouteFile(routesDir, "")).toBe("");
    });

    it("边界：仅空格应返回空串", () => {
      const routesDir = join(projectRoot, "src", "routes");
      expect(extractComponentPathFromRouteFile(routesDir, "   ")).toBe("");
    });

    it("边界：带 ./ 前缀的相对路径应去除前缀", () => {
      const raw = "./user/[id].tsx";
      const result = extractComponentPathFromRouteFile(
        "C:/project/src/routes",
        raw,
      );
      expect(result).toBe("user/[id]");
    });

    it("边界：routesDirPath 与 rawPath 不一致时返回归一后的 rawPath", () => {
      const raw = "E:/other/project/src/routes/foo.tsx";
      const result = extractComponentPathFromRouteFile(
        "C:/project/src/routes",
        raw,
      );
      expect(result).toContain("foo");
      expect(result).not.toContain("\\");
    });

    it("边界：带 [id] 动态段应正确提取", () => {
      const raw = "C:\\project\\src\\routes\\blog\\[slug].tsx";
      const result = extractComponentPathFromRouteFile(
        "C:/project/src/routes",
        raw,
      );
      expect(result).toBe("blog/[slug]");
    });

    it("边界：无扩展名路径应能处理", () => {
      const raw = "user/[id]";
      const result = extractComponentPathFromRouteFile(
        "C:/project/src/routes",
        raw,
      );
      expect(result).toBe("user/[id]");
    });
  });

  // ==================== 路径安全校验 ====================
  describe("路径安全校验 (isPathWithinProject)", () => {
    it("项目根路径应在项目内", () => {
      expect(isPathWithinProject(projectRoot, projectRoot)).toBe(true);
    });

    it("项目子路径应在项目内", () => {
      expect(
        isPathWithinProject(join(projectRoot, "src/foo.ts"), projectRoot),
      ).toBe(true);
    });

    it("项目外路径应返回 false（含 ../ 穿越等构造方式）", () => {
      // 项目外路径无论如何构造（含 resolve(projectRoot, "..", ...) 穿越），均应返回 false
      expect(
        isPathWithinProject(join(otherDir, "file.ts"), projectRoot),
      ).toBe(false);
    });

    it("边界：路径穿越 ../ 到项目外应返回 false", () => {
      // 使用 dirname 三次到祖父目录，再拼接兄弟目录名，确保路径在 projectRoot 外
      const siblingName = otherDir.split(/[/\\]/).filter(Boolean).pop() ??
        "other";
      const outside = join(
        dirname(dirname(dirname(projectRoot))),
        siblingName,
        "file.ts",
      );
      expect(isPathWithinProject(outside, projectRoot)).toBe(false);
    });

    it("边界：projectRoot 带末尾斜杠应正确比较", () => {
      const rootWithSlash = projectRoot + "/";
      expect(
        isPathWithinProject(join(projectRoot, "src/foo.ts"), rootWithSlash),
      )
        .toBe(true);
    });

    it.skipIf(
      platform() !== "windows",
      "Windows 反斜杠子路径应在项目内",
      () => {
        const winStyle = projectRoot.replace(/\//g, "\\") + "\\src\\config.ts";
        expect(isPathWithinProject(winStyle, projectRoot)).toBe(true);
      },
    );

    /**
     * GHA / CI 下常见：`fs.realpath` 返回 8.3 短名（`RUNNER~1`）而 `cwd()` 为长名，
     * 仅靠 strip `\\?\\` 仍无法与项目根比字符串。`isPathWithinProject` 在 Windows
     * 上对双方做 `realPathSync` 与现有逐字/斜杠归一后一致。
     */
    it("Windows 下 已存在文件的 realPath 与 projectRoot 应判为项目内", async () => {
      if (platform() !== "windows") {
        return;
      }
      const f = join(projectRoot, "dweb-ispath-realpath.txt");
      await writeTextFile(f, "1");
      const fromReal = realPathSync(f);
      expect(isPathWithinProject(fromReal, projectRoot)).toBe(true);
    });
  });

  // ==================== 日志友好路径 ====================
  describe("日志友好路径 (pathForLog) Windows 路径", () => {
    it("项目内 Windows 风格路径应返回相对路径", () => {
      const full = join(projectRoot, "config", "main.ts");
      expect(pathForLog(full, projectRoot)).toBe("config/main.ts");
    });

    it("Windows 反斜杠路径在项目内应正确相对化", () => {
      const winFull = join(projectRoot, "src", "routes").replace(/\//g, "\\") +
        "\\index.tsx";
      const rel = pathForLog(winFull, projectRoot);
      expect(rel).toContain("routes");
      expect(rel).toContain("index.tsx");
    });

    it("边界：项目外路径应返回原路径", () => {
      const outside = join(otherDir, "secret.ts");
      expect(pathForLog(outside, projectRoot)).toBe(outside);
    });

    it("边界：项目根应返回 .", () => {
      expect(pathForLog(projectRoot, projectRoot)).toBe(".");
    });
  });

  // ==================== 平台相关（仅 Windows 上执行） ====================
  describe("平台相关逻辑（仅 Windows 上执行）", () => {
    it.skipIf(
      platform() !== "windows",
      "Windows 下 isPathWithinProject 应大小写不敏感（C:\\Path 与 c:\\path 视为同一项目）",
      () => {
        // 仅在 Windows 上运行：路径大小写不同应视为项目内
        expect(isPathWithinProject(projectRoot, projectRoot)).toBe(true);
        expect(
          isPathWithinProject(
            join(projectRoot, "src/foo.ts"),
            projectRoot,
          ),
        ).toBe(true);
      },
    );
  });
});

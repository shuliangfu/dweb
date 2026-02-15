/**
 * build-dirs 单元测试
 *
 * 测试 getInferredBuildOutputDirs 的入口路径推断逻辑：
 * - 单应用：main.ts、src/main.ts
 * - 多应用（有 src）：src/backend/main.ts
 * - 多应用（无 src）：backend/main.ts
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { getInferredBuildOutputDirs } from "../../src/utils/build-dirs.ts";

describe("getInferredBuildOutputDirs", () => {
  it("main.ts（无 src 单应用）→ dist、dist/client", () => {
    const { server, client } = getInferredBuildOutputDirs("main.ts");
    expect(server).toBe("dist");
    expect(client).toBe("dist/client");
  });

  it("src/main.ts（单应用）→ dist、dist/client", () => {
    const { server, client } = getInferredBuildOutputDirs("src/main.ts");
    expect(server).toBe("dist");
    expect(client).toBe("dist/client");
  });

  it("backend/main.ts（无 src 多应用）→ dist/backend、dist/backend/client", () => {
    const { server, client } = getInferredBuildOutputDirs("backend/main.ts");
    expect(server).toBe("dist/backend");
    expect(client).toBe("dist/backend/client");
  });

  it("frontend/main.ts（无 src 多应用）→ dist/frontend、dist/frontend/client", () => {
    const { server, client } = getInferredBuildOutputDirs("frontend/main.ts");
    expect(server).toBe("dist/frontend");
    expect(client).toBe("dist/frontend/client");
  });

  it("src/backend/main.ts（有 src 多应用）→ dist/backend、dist/backend/client", () => {
    const { server, client } = getInferredBuildOutputDirs(
      "src/backend/main.ts",
    );
    expect(server).toBe("dist/backend");
    expect(client).toBe("dist/backend/client");
  });

  it("src/frontend/main.ts（有 src 多应用）→ dist/frontend、dist/frontend/client", () => {
    const { server, client } = getInferredBuildOutputDirs(
      "src/frontend/main.ts",
    );
    expect(server).toBe("dist/frontend");
    expect(client).toBe("dist/frontend/client");
  });

  it("带 ./ 前缀的入口路径应正确解析", () => {
    const { server, client } = getInferredBuildOutputDirs("./backend/main.ts");
    expect(server).toBe("dist/backend");
    expect(client).toBe("dist/backend/client");
  });

  it("dist/server.js（运行构建产物单应用）→ dist、dist/client", () => {
    const { server, client } = getInferredBuildOutputDirs("dist/server.js");
    expect(server).toBe("dist");
    expect(client).toBe("dist/client");
  });

  it("dist/backend/server.js（运行构建产物多应用）→ dist/backend、dist/backend/client", () => {
    const { server, client } = getInferredBuildOutputDirs(
      "dist/backend/server.js",
    );
    expect(server).toBe("dist/backend");
    expect(client).toBe("dist/backend/client");
  });

  it("build/server.js（用户配置 output 为 build）→ build、build/client", () => {
    const { server, client } = getInferredBuildOutputDirs("build/server.js");
    expect(server).toBe("build");
    expect(client).toBe("build/client");
  });

  it("output/frontend/server.js（用户配置 output 为 output）→ output/frontend、output/frontend/client", () => {
    const { server, client } = getInferredBuildOutputDirs(
      "output/frontend/server.js",
    );
    expect(server).toBe("output/frontend");
    expect(client).toBe("output/frontend/client");
  });

  it("段数 4 应抛出错误", () => {
    expect(() => getInferredBuildOutputDirs("src/a/b/main.ts")).toThrow(
      /Entry path format not supported|入口路径格式不支持|需 1–3 段/,
    );
  });

  it("段数 0（空路径）应抛出错误", () => {
    expect(() => getInferredBuildOutputDirs("")).toThrow(
      /Entry path format not supported|入口路径格式不支持|需 1–3 段/,
    );
  });

  it("Windows 超长路径（含 ../ 与 URL 编码）应提取 src/main.ts → dist、dist/client", () => {
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

  it("Windows 反斜杠路径应正确解析（src\\main.ts → dist、dist/client）", () => {
    const { server, client } = getInferredBuildOutputDirs("src\\main.ts");
    expect(server).toBe("dist");
    expect(client).toBe("dist/client");
  });

  it("Windows 反斜杠超长路径应提取 src/main.ts → dist、dist/client", () => {
    const { server, client } = getInferredBuildOutputDirs(
      "..\\..\\..\\Users\\foo\\Desktop\\app-test\\src\\main.ts",
    );
    expect(server).toBe("dist");
    expect(client).toBe("dist/client");
  });
});

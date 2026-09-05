/**
 * 项目检测工具测试
 *
 * 测试 src/utils/project.ts：
 * - getProjectInfo 能正确解析单应用 deno.json
 * - getProjectInfo 能正确解析多应用 deno.json
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { join, makeTempDir, writeTextFile } from "@dreamer/runtime-adapter";
import {
  findProjectRoot,
  getProjectInfo,
  stripJsonComments,
} from "../../src/utils/project.ts";

describe("项目检测 (project.ts)", () => {
  it("stripJsonComments 应能正确剥离单行与多行注释并保留字符串内容", () => {
    const raw = `{
      // 这是单行注释
      /* 这是
         多行注释 */
      "name": "test-app // not comment",
      "url": "https://example.com/*not comment*/"
    }`;
    const stripped = stripJsonComments(raw);
    const parsed = JSON.parse(stripped);
    expect(parsed.name).toBe("test-app // not comment");
    expect(parsed.url).toBe("https://example.com/*not comment*/");
  });

  it("getProjectInfo 应能解析带注释的 deno.jsonc", async () => {
    const dir = await makeTempDir();
    await writeTextFile(
      join(dir, "deno.jsonc"),
      `{
        // 配置文件注释
        "tasks": {
          /* 多行任务定义 */
          "dev": "deno run -A src/main.ts"
        }
      }`,
    );
    const info = await getProjectInfo(dir);
    expect(info).not.toBeNull();
    expect(info!.mode).toBe("single");
    expect(info!.tasks.dev).toBe("deno run -A src/main.ts");
  });

  it("findProjectRoot 与 getProjectInfo 应支持从子目录自动向上查找根目录", async () => {
    const root = await makeTempDir();
    const sub = join(root, "src", "backend");
    const { mkdir } = await import("@dreamer/runtime-adapter");
    await mkdir(sub, { recursive: true });
    await writeTextFile(
      join(root, "deno.json"),
      JSON.stringify({
        tasks: {
          "dev": "deno run -A main.ts",
        },
      }),
    );

    const detectedRoot = await findProjectRoot(sub);
    expect(detectedRoot).toBe(root);

    const info = await getProjectInfo(sub);
    expect(info).not.toBeNull();
    expect(info!.tasks.dev).toBe("deno run -A main.ts");
  });

  it("getProjectInfo 应能解析单应用 deno.json", async () => {
    const dir = await makeTempDir();
    await writeTextFile(
      join(dir, "deno.json"),
      JSON.stringify({
        tasks: {
          dev: "deno run -A src/main.ts",
          build: "deno run -A src/main.ts --build",
          start: "deno run -A dist/server.js",
        },
      }),
    );
    const info = await getProjectInfo(dir);
    expect(info).not.toBeNull();
    expect(info!.mode).toBe("single");
    expect(info!.appNames).toEqual([]);
    expect(info!.tasks.dev).toBe("deno run -A src/main.ts");
  });

  it("getProjectInfo 应能解析多应用 deno.json", async () => {
    const dir = await makeTempDir();
    await writeTextFile(
      join(dir, "deno.json"),
      JSON.stringify({
        tasks: {
          "dev:backend": "deno run -A src/backend/main.ts",
          "dev:frontend": "deno run -A src/frontend/main.ts",
          "build:backend": "deno run -A src/backend/main.ts --build",
          "build:frontend": "deno run -A src/frontend/main.ts --build",
          "start:backend": "deno run -A dist/backend/server.js",
          "start:frontend": "deno run -A dist/frontend/server.js",
        },
      }),
    );
    const info = await getProjectInfo(dir);
    expect(info).not.toBeNull();
    expect(info!.mode).toBe("multi");
    expect(info!.appNames).toContain("backend");
    expect(info!.appNames).toContain("frontend");
    expect(info!.appNames.length).toBe(2);
    expect(info!.tasks["dev:backend"]).toBe("deno run -A src/backend/main.ts");
  });

  it("getProjectInfo 在无 deno.json 时应返回 null", async () => {
    const dir = await makeTempDir();
    const info = await getProjectInfo(dir);
    expect(info).toBeNull();
  });
});

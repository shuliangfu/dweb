/**
 * 项目检测工具测试
 *
 * 测试 src/utils/project.ts：
 * - getProjectInfo 能正确解析单应用 deno.json
 * - getProjectInfo 能正确解析多应用 deno.json
 */

import { describe, expect, it } from "@dreamer/test";
import { makeTempDir, writeTextFile, join } from "@dreamer/runtime-adapter";
import { getProjectInfo } from "../../src/utils/project.ts";

describe("项目检测 (project.ts)", () => {
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

/**
 * init 脚手架测试
 *
 * 测试 src/cmd/init.ts：
 * - generate() 能正确生成单应用项目结构
 * - generate() 能正确生成多应用项目结构
 * - 生成的文件不包含 Socket.IO 相关代码
 */

import { describe, expect, it } from "@dreamer/test";
import {
  exists,
  join,
  makeTempDir,
  readTextFile,
  remove,
} from "@dreamer/runtime-adapter";
import { generate, type InitOptions } from "../../src/cmd/init.ts";

describe("init (cmd/init.ts)", () => {
  let testDir: string;

  it("generate() 应能生成单应用项目（Preact + Tailwind + with-about）", async () => {
    testDir = await makeTempDir({ prefix: "dweb-init-single-" });

    const opts: InitOptions = {
      targetDir: testDir,
      projectName: "test-app",
      appMode: "single",
      engine: "preact",
      renderMode: "hybrid",
      style: "tailwind",
      useSrc: true,
      exampleLevel: "with-about",
    };

    await generate(opts);

    // 验证目录结构
    expect(await exists(join(testDir, "deno.json"))).toBe(true);
    expect(await exists(join(testDir, ".gitignore"))).toBe(true);
    expect(await exists(join(testDir, "config", "main.ts"))).toBe(true);
    expect(await exists(join(testDir, "config", "main.dev.ts"))).toBe(true);
    expect(await exists(join(testDir, "src", "main.ts"))).toBe(true);
    expect(await exists(join(testDir, "src", "routes", "_app.tsx"))).toBe(true);
    expect(await exists(join(testDir, "src", "routes", "_layout.tsx"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "routes", "index.tsx"))).toBe(true);
    expect(await exists(join(testDir, "src", "routes", "about.tsx"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "routes", "user", "[id].tsx")))
      .toBe(true);
    expect(await exists(join(testDir, "src", "assets", "tailwind.css"))).toBe(
      true,
    );

    // 验证 main.ts 不包含 socket-io
    const mainTs = await readTextFile(join(testDir, "src", "main.ts"));
    expect(mainTs).not.toContain("socket");
    expect(mainTs).not.toContain("Socket");
    expect(mainTs).toContain("configDirectory");
    expect(mainTs).toContain("tailwindPlugin");

    // 验证 config 不包含 socketIo
    const configTs = await readTextFile(join(testDir, "config", "main.ts"));
    expect(configTs).not.toContain("socketIo");

    // 验证 deno.json 不包含 socket-io 依赖
    const denoJson = await readTextFile(join(testDir, "deno.json"));
    expect(denoJson).not.toContain("socket-io");

    await remove(testDir, { recursive: true });
  });

  it("generate() 应能生成多应用项目", async () => {
    testDir = await makeTempDir({ prefix: "dweb-init-multi-" });

    const opts: InitOptions = {
      targetDir: testDir,
      projectName: "test-multi",
      appMode: "multi",
      appNames: ["backend", "frontend"],
      engine: "preact",
      renderMode: "ssr",
      style: "tailwind",
      useSrc: true,
      exampleLevel: "minimal",
    };

    await generate(opts);

    // 验证 common 目录
    expect(await exists(join(testDir, "src", "common", "config", "main.ts")))
      .toBe(true);

    // 验证各应用目录
    for (const app of ["backend", "frontend"]) {
      expect(await exists(join(testDir, "src", app, "main.ts"))).toBe(true);
      expect(await exists(join(testDir, "src", app, "config", "main.ts"))).toBe(
        true,
      );
      expect(await exists(join(testDir, "src", app, "routes", "index.tsx")))
        .toBe(true);
    }

    await remove(testDir, { recursive: true });
  });
});

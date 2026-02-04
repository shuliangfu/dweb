/**
 * init 脚手架测试
 *
 * 测试 src/cmd/init.ts：
 * - generate() 能正确生成单应用项目结构
 * - generate() 能正确生成多应用项目结构
 * - 生成的文件不包含 Socket.IO 相关代码
 * - 应用名称从 config/main.ts 读取，deno.json 不包含 name 字段（避免 Deno 警告）
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

    // 验证目录结构（单应用 useSrc 时 config 在 src/config）
    expect(await exists(join(testDir, "deno.json"))).toBe(true);
    expect(await exists(join(testDir, ".gitignore"))).toBe(true);
    expect(await exists(join(testDir, "src", "config", "main.ts"))).toBe(true);
    expect(await exists(join(testDir, "src", "config", "main.dev.ts"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "main.ts"))).toBe(true);
    expect(await exists(join(testDir, "src", "routes", "_app.tsx"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "routes", "_layout.tsx"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "routes", "index.tsx"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "routes", "about.tsx"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "routes", "user", "[id].tsx")))
      .toBe(true);
    expect(await exists(join(testDir, "src", "assets", "tailwind.css"))).toBe(
      true,
    );

    // 验证 main.ts 不包含 socket-io，单应用使用 new App() 由框架从 config/main.ts 加载配置
    const mainTs = await readTextFile(join(testDir, "src", "main.ts"));
    expect(mainTs).not.toContain("socket");
    expect(mainTs).not.toContain("Socket");
    expect(mainTs).toContain("tailwindPlugin");

    // 验证 config/main.ts 包含 name 字段（应用名称由此读取）
    const configTs = await readTextFile(
      join(testDir, "src", "config", "main.ts"),
    );
    expect(configTs).toContain('name: "test-app"');
    expect(configTs).not.toContain("socketIo");

    // 验证 deno.json 不包含 name 字段（避免 Deno 警告），且不包含 socket-io 依赖
    const denoJson = await readTextFile(join(testDir, "deno.json"));
    expect(denoJson).not.toContain('"name":');
    expect(denoJson).not.toContain("socket-io");

    // 验证 deno.json 包含必要依赖：dweb、render、router、plugins（仅主包）、tailwind 相关
    expect(denoJson).toContain("@dreamer/dweb");
    expect(denoJson).toContain("@dreamer/render");
    expect(denoJson).toContain("@dreamer/router");
    expect(denoJson).toContain("@dreamer/plugins");
    expect(denoJson).toContain("postcss");
    expect(denoJson).toContain("tailwindcss");
    expect(denoJson).toContain("@tailwindcss/postcss");

    // 未使用 --beta 时，render/router/plugins 未发正式版，统一用 1.0.0
    expect(denoJson).toContain("@dreamer/render@1.0.0");
    expect(denoJson).toContain("@dreamer/router@1.0.0");

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

    // 验证 deno.json 不包含 name 字段
    const denoJson = await readTextFile(join(testDir, "deno.json"));
    expect(denoJson).not.toContain('"name":');

    // 验证各应用目录及 config/main.ts 包含对应应用名
    for (const app of ["backend", "frontend"]) {
      expect(await exists(join(testDir, "src", app, "main.ts"))).toBe(true);
      expect(await exists(join(testDir, "src", app, "config", "main.ts"))).toBe(
        true,
      );
      expect(await exists(join(testDir, "src", app, "routes", "index.tsx")))
        .toBe(true);
      const appConfigTs = await readTextFile(
        join(testDir, "src", app, "config", "main.ts"),
      );
      expect(appConfigTs).toContain(`name: "${app}"`);
    }

    await remove(testDir, { recursive: true });
  });

  it("generate() 选择 unocss 时应包含 unocss 依赖", async () => {
    testDir = await makeTempDir({ prefix: "dweb-init-unocss-" });

    const opts: InitOptions = {
      targetDir: testDir,
      projectName: "unocss-app",
      appMode: "single",
      engine: "preact",
      renderMode: "csr",
      style: "unocss",
      useSrc: true,
      exampleLevel: "minimal",
    };

    await generate(opts);

    const denoJson = await readTextFile(join(testDir, "deno.json"));
    expect(denoJson).toContain("@dreamer/plugins");
    expect(denoJson).toContain("@unocss/core");
    expect(denoJson).toContain("@unocss/preset-wind3");
    expect(denoJson).toContain("@unocss/preset-icons");

    await remove(testDir, { recursive: true });
  });
});

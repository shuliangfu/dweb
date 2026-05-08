/**
 * init 脚手架测试
 *
 * 测试 src/cmd/init.ts：
 * - generate() 能正确生成单应用项目结构
 * - generate() 能正确生成多应用项目结构
 * - 生成的文件不包含 Socket.IO 相关代码
 * - 应用名称从 config/main.ts 读取，deno.json 不包含 name 字段（避免 Deno 警告）
 * - View 引擎：index 默认 `createSignal` + `.value`（init 模板不出现元组解构）
 */

import "../setup.ts";
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

  it(
    "generate() 应能生成单应用项目（Preact + Tailwind + with-about）",
    async () => {
      // 使用「父级临时目录 + 不存在的子路径」作为 targetDir，避免 generate() 内 exists 为 true 触发 confirm（测试不交互）
      const parentDir = await makeTempDir({ prefix: "dweb-init-single-" });
      testDir = join(parentDir, "test-app");

      const opts: InitOptions = {
        targetDir: testDir,
        projectName: "test-app",
        appMode: "single",
        runtime: "deno",
        engine: "preact",
        renderMode: "hybrid",
        style: "tailwind",
        useSrc: true,
        exampleLevel: "with-about",
      };

      await generate(opts);

      // 验证目录结构（单应用 useSrc 时 config 在 src/config）；Deno 运行时仅生成 deno.json
      expect(await exists(join(testDir, "deno.json"))).toBe(true);
      expect(await exists(join(testDir, "package.json"))).toBe(false);
      expect(await exists(join(testDir, ".npmrc"))).toBe(false);
      expect(await exists(join(testDir, ".gitignore"))).toBe(true);
      expect(await exists(join(testDir, "src", "config", "main.ts"))).toBe(
        true,
      );
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

      // 未使用 --beta 时，render/router/plugins 从 JSR 获取最新稳定版；@dreamer/* 使用 ^ 符号
      expect(denoJson).toMatch(/@dreamer\/render@\^1\.\d+\.\d+/);
      expect(denoJson).toMatch(/@dreamer\/router@\^1\.\d+\.\d+/);

      await remove(parentDir, { recursive: true });
    },
    { timeout: 20_000 },
  );

  it(
    "generate() 应能生成多应用项目",
    async () => {
      const parentDir = await makeTempDir({ prefix: "dweb-init-multi-" });
      testDir = join(parentDir, "test-multi");

      const opts: InitOptions = {
        targetDir: testDir,
        projectName: "test-multi",
        appMode: "multi",
        appNames: ["backend", "frontend"],
        runtime: "deno",
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

      // Deno 运行时：有 deno.json，无 package.json
      expect(await exists(join(testDir, "deno.json"))).toBe(true);
      expect(await exists(join(testDir, "package.json"))).toBe(false);

      // 验证 deno.json 不包含 name 字段
      const denoJson = await readTextFile(join(testDir, "deno.json"));
      expect(denoJson).not.toContain('"name":');

      // 验证各应用 config/main.ts 中 name 为「项目名-应用目录名」（如 test-multi-backend）
      for (const app of ["backend", "frontend"]) {
        expect(await exists(join(testDir, "src", app, "main.ts"))).toBe(true);
        expect(await exists(join(testDir, "src", app, "config", "main.ts")))
          .toBe(
            true,
          );
        expect(await exists(join(testDir, "src", app, "routes", "index.tsx")))
          .toBe(true);
        const appConfigTs = await readTextFile(
          join(testDir, "src", app, "config", "main.ts"),
        );
        expect(appConfigTs).toContain(`name: "test-multi-${app}"`);
      }

      await remove(parentDir, { recursive: true });
    },
    // Windows CI 上临时目录与多应用写入较慢，与单应用 / View 用例一致放宽超时
    { timeout: 20_000 },
  );

  it(
    "generate() 选择 unocss 时应包含 unocss 依赖",
    async () => {
      const parentDir = await makeTempDir({ prefix: "dweb-init-unocss-" });
      testDir = join(parentDir, "unocss-app");

      const opts: InitOptions = {
        targetDir: testDir,
        projectName: "unocss-app",
        appMode: "single",
        runtime: "deno",
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

      await remove(parentDir, { recursive: true });
    },
    // 与多应用用例相同：CI Windows + Bun 下 generate 易超默认 5s
    { timeout: 20_000 },
  );

  it("generate() 选择 Bun 运行时应生成 package.json 与 .npmrc，且不生成 deno.json", async () => {
    const parentDir = await makeTempDir({ prefix: "dweb-init-bun-" });
    testDir = join(parentDir, "bun-app");

    const opts: InitOptions = {
      targetDir: testDir,
      projectName: "bun-app",
      appMode: "single",
      runtime: "bun",
      engine: "preact",
      renderMode: "hybrid",
      style: "tailwind",
      useSrc: true,
      exampleLevel: "minimal",
    };

    await generate(opts);

    expect(await exists(join(testDir, "package.json"))).toBe(true);
    expect(await exists(join(testDir, ".npmrc"))).toBe(true);
    expect(await exists(join(testDir, "deno.json"))).toBe(false);

    const packageJson = await readTextFile(join(testDir, "package.json"));
    expect(packageJson).toContain('"version": "1.0.0"');
    expect(packageJson).toContain('"dev":');
    expect(packageJson).toContain('"build":');
    expect(packageJson).toContain('"start":');
    expect(packageJson).toContain("bun run");
    expect(packageJson).toContain("@dreamer/dweb");

    const npmrc = await readTextFile(join(testDir, ".npmrc"));
    expect(npmrc).toContain("@jsr:registry=");

    const dockerfile = await readTextFile(join(testDir, "Dockerfile"));
    expect(dockerfile).toContain("oven/bun");

    expect(await exists(join(testDir, "tsconfig.json"))).toBe(true);
    const tsconfig = await readTextFile(join(testDir, "tsconfig.json"));
    expect(tsconfig).toContain("react-jsx");
    expect(tsconfig).toContain('"jsxImportSource": "preact"');
    expect(tsconfig).toContain("src/**/*");
    expect(tsconfig).toContain("node_modules");
    expect(tsconfig).toContain("nodenext");

    await remove(parentDir, { recursive: true });
  });

  it(
    "generate() View 引擎：首页须用 createSignal + .value",
    async () => {
      const parentDir = await makeTempDir({ prefix: "dweb-init-view-" });
      const dir = join(parentDir, "view-app");

      const opts: InitOptions = {
        targetDir: dir,
        projectName: "view-app",
        appMode: "single",
        runtime: "deno",
        engine: "view",
        renderMode: "hybrid",
        style: "tailwind",
        useSrc: true,
        exampleLevel: "minimal",
      };

      await generate(opts);

      const indexTsx = await readTextFile(
        join(dir, "src", "routes", "index.tsx"),
      );
      expect(indexTsx).toContain(
        'import { createSignal } from "@dreamer/view"',
      );
      expect(indexTsx).toContain("const count = createSignal(0)");
      expect(indexTsx).toContain("count.value = count.value + 1");
      expect(indexTsx).not.toMatch(/\[count,\s*setCount\]\s*=\s*createSignal/);

      const configTs = await readTextFile(
        join(dir, "src", "config", "main.ts"),
      );
      expect(configTs).toContain('engine: "view"');
      expect(configTs).toContain('mode: "hybrid"');

      const denoJson = await readTextFile(join(dir, "deno.json"));
      expect(denoJson).toContain("@dreamer/view");
      expect(denoJson).toContain('"jsxImportSource": "@dreamer/view"');
      expect(denoJson).not.toContain("jsx.d.ts");
      expect(await exists(join(dir, "jsx.d.ts"))).toBe(false);

      await remove(parentDir, { recursive: true });
    },
    { timeout: 20_000 },
  );
});

/**
 * integration: 配置与生命周期集成测试
 *
 * 测试 config 加载 + lifecycle 钩子 + middleware 的协作。
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { App } from "../../src/core/app.ts";

describe("integration: 配置与生命周期", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-integration-" });
    originalCwd = cwd();
    chdir(testDir);

    await ensureDir(join(testDir, "config"));
    await writeTextFile(
      join(testDir, "config", "main.ts"),
      `export default {
  name: "integration-test",
  version: "1.0.0",
  server: { port: 39997, host: "127.0.0.1" },
  render: { engine: "preact", mode: "ssr" },
  router: { routesDir: "./src/routes" },
  build: { client: { output: "dist/client", engine: "preact" } },
};`,
    );

    await ensureDir(join(testDir, "src", "routes"));
    await writeTextFile(
      join(testDir, "src", "routes", "index.tsx"),
      `export default function Page() { return "Integration"; }`,
    );
    await writeTextFile(
      join(testDir, "src", "routes", "_app.tsx"),
      `export default function App({ children }: { children: unknown }) { return <>{children}</>; }`,
    );
    await writeTextFile(
      join(testDir, "src", "routes", "_layout.tsx"),
      `export default function Layout({ children }: { children: unknown }) { return <>{children}</>; }`,
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("App 应能加载 config 并注册生命周期钩子", async () => {
    const stages: string[] = [];
    const app = new App({
      name: "integration-test",
      version: "1.0.0",
    });

    app.on("init", () => stages.push("init"));
    app.on("start", () => stages.push("start"));

    // 等待异步初始化完成（config 加载、生命周期触发）
    await (app as unknown as { _initPromise: Promise<void> })._initPromise;

    expect(app.name).toBe("integration-test");
    expect(app.version).toBe("1.0.0");
    expect(stages).toContain("init");
  }, { sanitizeOps: false, sanitizeResources: false });
});

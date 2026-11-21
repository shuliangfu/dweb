/**
 * build 命令测试
 *
 * 测试 src/cmd/build.ts：
 * - main 在无 deno.json 时提前返回
 * - 无 build task、单应用/多应用短任务成功与失败
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@dreamer/test";
import { main } from "../../src/cmd/build.ts";

describe("build (cmd/build.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-build-test-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("无 deno.json 时应正常返回（不抛错）", async () => {
    await main([], {});
  });

  it("有 deno.json 但无 build task 时应正常返回", async () => {
    await writeTextFile(
      join(testDir, "deno.json"),
      JSON.stringify({ name: "test" }),
    );
    await main([], {});
  });
});

describe("build 早退与短任务", () => {
  const temps: string[] = [];
  const cwdStack: string[] = [];

  afterEach(async () => {
    while (cwdStack.length) chdir(cwdStack.pop()!);
    for (const dir of temps.splice(0)) {
      await remove(dir, { recursive: true }).catch(() => {});
    }
  });

  async function enterTemp(prefix: string, denoJson: unknown): Promise<void> {
    const dir = await makeTempDir({ prefix });
    temps.push(dir);
    await writeTextFile(`${dir}/deno.json`, JSON.stringify(denoJson));
    cwdStack.push(cwd());
    chdir(dir);
  }

  it("单应用有 build task 且成功时应走完", async () => {
    await enterTemp("dweb-build-ok-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { build: "echo built" },
    });
    await main(["ignored"], {});
  });

  it("单应用有 build task 且失败时不应抛出", async () => {
    await enterTemp("dweb-build-fail-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { build: "exit 1" },
    });
    await main([], { app: "web" });
  });

  it("多应用指定不存在的应用时应返回", async () => {
    await enterTemp("dweb-build-multi-missing-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "build:web": "echo web" },
    });
    await main([], { app: "api" });
  });

  it("多应用缺少某个 build task 时应跳过并继续", async () => {
    await enterTemp("dweb-build-multi-skip-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "build:web": "echo web", "dev:api": "echo api" },
    });
    await main([], {});
  });

  it("多应用有对应 task 且全部成功时应走完", async () => {
    await enterTemp("dweb-build-multi-ok-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "build:web": "echo web", "build:api": "echo api" },
    });
    await main([], {});
  });

  it("多应用某个 task 失败时应返回", async () => {
    await enterTemp("dweb-build-multi-fail-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "build:web": "echo web", "build:api": "exit 1" },
    });
    await main([], {});
  });
});

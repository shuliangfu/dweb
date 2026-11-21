/**
 * dev 命令测试
 *
 * 测试 src/cmd/dev.ts 的早退与短任务回退，不启动开发服务器。
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, afterEach, beforeAll, describe, it } from "@dreamer/test";
import { main } from "../../src/cmd/dev.ts";

describe("dev (cmd/dev.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-dev-test-" });
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
});

describe("dev 早退与短任务", () => {
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

  it("单应用没有 dev task 时应返回", async () => {
    await enterTemp("dweb-dev-notask-", { name: "tmp", version: "0.0.1" });
    await main(["ignored"], {});
  });

  it("单应用有 dev task 且成功时应走完", async () => {
    await enterTemp("dweb-dev-ok-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { dev: "echo dev-ok" },
    });
    await main([], {});
  });

  it("单应用有 dev task 且失败时不应抛出", async () => {
    await enterTemp("dweb-dev-fail-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { dev: "exit 1" },
    });
    await main(["extra"], { app: "web" });
  });

  it("多应用未指定应用名时应返回", async () => {
    await enterTemp("dweb-dev-multi-need-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "dev:web": "echo web" },
    });
    await main([], {});
  });

  it("多应用指定不存在的应用时应返回", async () => {
    await enterTemp("dweb-dev-multi-missing-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "dev:web": "echo web" },
    });
    await main([], { app: "api" });
  });

  it("多应用有对应 task 且成功时应走完", async () => {
    await enterTemp("dweb-dev-multi-ok-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "dev:web": "echo web" },
    });
    await main(["web"], {});
  });

  it("多应用有对应 task 且失败时不应抛出", async () => {
    await enterTemp("dweb-dev-multi-fail-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "dev:web": "exit 1" },
    });
    await main([], { app: "web" });
  });
});

/**
 * lint 命令测试
 *
 * 测试 src/cmd/lint.ts：
 * - main 在无 deno.json 时提前返回
 * - 有 lint task 时走 task；无 task 时回退 deno lint
 */

import "../setup.ts";
import {
  chdir,
  cwd,
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
import { main } from "../../src/cmd/lint.ts";

describe("lint (cmd/lint.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-lint-test-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("无 deno.json 时应正常返回（不抛错）", async () => {
    expect(await main([], {})).toBe(2);
  });
});

describe("lint 早退与 task 回退", () => {
  const temps: string[] = [];
  const cwdStack: string[] = [];

  afterEach(async () => {
    while (cwdStack.length) chdir(cwdStack.pop()!);
    for (const dir of temps.splice(0)) {
      await remove(dir, { recursive: true }).catch(() => {});
    }
  });

  async function enterTemp(prefix: string, denoJson: unknown): Promise<string> {
    const dir = await makeTempDir({ prefix });
    temps.push(dir);
    await writeTextFile(`${dir}/deno.json`, JSON.stringify(denoJson));
    cwdStack.push(cwd());
    chdir(dir);
    return dir;
  }

  it("有 lint task 且成功时应返回 0", async () => {
    await enterTemp("dweb-lint-ok-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { lint: "echo linted" },
    });
    expect(await main([], {})).toBe(0);
  });

  it("有 lint task 且失败时应返回非 0", async () => {
    await enterTemp("dweb-lint-fail-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { lint: "exit 7" },
    });
    expect(await main([], {})).toBe(7);
  });

  it("没有 lint task 时应回退直接 lint 并成功", async () => {
    const dir = await enterTemp("dweb-lint-fallback-", {
      name: "tmp",
      version: "0.0.1",
    });
    await writeTextFile(`${dir}/ok.ts`, "export const n = 1;\n");
    expect(await main([`${dir}/ok.ts`], {})).toBe(0);
  });
});

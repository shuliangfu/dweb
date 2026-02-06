/**
 * build 命令测试
 *
 * 测试 src/cmd/build.ts：
 * - main 在无 deno.json 时提前返回
 * - main 在无 build task 时提示错误
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
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
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

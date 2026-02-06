/**
 * test 命令测试
 *
 * 测试 src/cmd/test.ts：
 * - main 在无 deno.json 时提前返回
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  makeTempDir,
  remove,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, it } from "@dreamer/test";
import { main } from "../../src/cmd/test.ts";

describe("test (cmd/test.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-test-cmd-test-" });
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

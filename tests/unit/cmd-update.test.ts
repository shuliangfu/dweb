/**
 * update 命令测试
 *
 * 测试 src/cmd/update.ts：
 * - main 能正常执行（无 deno.json 时提前返回）
 * - main 有 deno.json 时执行 deno/bun update
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
import { main } from "../../src/cmd/update.ts";

describe("update (cmd/update.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-update-test-" });
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

  it("有 deno.json 时应正常执行 update", async () => {
    // 不含 name，避免 Deno 要求 "exports" 的警告
    await writeTextFile(
      join(testDir, "deno.json"),
      JSON.stringify({ imports: {} }),
    );
    await main([], {});
  });
});

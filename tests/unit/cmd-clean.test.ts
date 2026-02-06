/**
 * clean 命令测试
 *
 * 测试 src/cmd/clean.ts：
 * - main 能清理 dist、.cache 等目录
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  ensureDir,
  exists,
  join,
  makeTempDir,
  remove,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { main } from "../../src/cmd/clean.ts";

describe("clean (cmd/clean.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-clean-test-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("应清理 dist 目录", async () => {
    const distDir = join(testDir, "dist");
    await ensureDir(distDir);
    expect(await exists(distDir)).toBe(true);

    await main([], {});
    expect(await exists(distDir)).toBe(false);
  });

  it("无目录可清理时应正常完成", async () => {
    await main([], {});
  });
});

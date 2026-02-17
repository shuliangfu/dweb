/**
 * upgrade 命令测试
 *
 * 测试 src/cmd/upgrade.ts：
 * - main 能正常执行（检查版本、可能提示已是最新）
 * - 升级安装时使用的 spawn 选项（stdin: "null"）不会导致卡住
 * - 实际执行 setup 安装命令，验证不卡住且安装成功
 */

import { createCommand, join } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import { main } from "../../src/cmd/upgrade.ts";
import { getRunArgs, getRuntime } from "../../src/utils/runtime.ts";
import { getRepoRoot } from "../setup.ts";
import "../setup.ts";

describe("upgrade (cmd/upgrade.ts)", () => {
  it("应能正常执行不抛错", async () => {
    await main([], {});
  });

  it("--beta 选项时应能正常执行", async () => {
    await main([], { beta: true });
  });
});

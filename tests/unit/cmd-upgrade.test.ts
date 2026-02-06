/**
 * upgrade 命令测试
 *
 * 测试 src/cmd/upgrade.ts：
 * - main 能正常执行（检查版本、可能提示已是最新）
 */

import "../setup.ts";
import { describe, it } from "@dreamer/test";
import { main } from "../../src/cmd/upgrade.ts";

describe("upgrade (cmd/upgrade.ts)", () => {
  it("应能正常执行不抛错", async () => {
    await main([], {});
  });

  it("--beta 选项时应能正常执行", async () => {
    await main([], { beta: true });
  });
});

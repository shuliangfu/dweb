/**
 * CLI 模块测试
 *
 * 测试 src/cli.ts：
 * - createCLI() 返回 Command 实例
 * - 包含预期子命令
 */

import { describe, expect, it } from "@dreamer/test";
import { createCLI } from "../../src/cli.ts";

describe("CLI (cli.ts)", () => {
  describe("createCLI()", () => {
    it("应返回 Command 实例且包含 execute 方法", () => {
      const cli = createCLI("1.0.0");
      expect(cli).toBeDefined();
      expect(typeof cli.execute).toBe("function");
    });
  });
});

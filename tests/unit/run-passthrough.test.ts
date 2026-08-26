/**
 * run -- 透传预处理单元测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  parseTrailingCommandArgs,
  preprocessCliArgsForRun,
  takeRunPassthrough,
} from "../../src/utils/run-passthrough.ts";

describe("run-passthrough", () => {
  it("preprocessCliArgsForRun 应剥离 -- 之后的段", () => {
    const cleaned = preprocessCliArgsForRun([
      "run",
      "hello/world",
      "-a",
      "console",
      "--",
      "--force",
      "x",
    ]);
    expect(cleaned).toEqual(["run", "hello/world", "-a", "console"]);
    expect(takeRunPassthrough()).toEqual(["--force", "x"]);
  });

  it("无 -- 时不改动 argv", () => {
    const input = ["run", "hello/world"];
    expect(preprocessCliArgsForRun(input)).toEqual(input);
    expect(takeRunPassthrough()).toEqual([]);
  });

  it("parseTrailingCommandArgs 应解析 --flag 与位置参数", () => {
    const r = parseTrailingCommandArgs(["--force", "--id", "1", "rest"]);
    expect(r.options.force).toBe(true);
    expect(r.options.id).toBe("1");
    expect(r.args).toEqual(["rest"]);
  });
});

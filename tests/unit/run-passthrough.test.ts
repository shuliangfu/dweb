/**
 * run 参数透传预处理单元测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  parseTrailingCommandArgs,
  preprocessCliArgsForRun,
  RunDoubleDashError,
  takeRunPassthrough,
} from "../../src/utils/run-passthrough.ts";

describe("run-passthrough", () => {
  it("裸 -- 分隔符直接拒绝", () => {
    expect(() =>
      preprocessCliArgsForRun([
        "run",
        "hello/world",
        "-a",
        "console",
        "--",
        "--force",
        "x",
      ])
    ).toThrow(RunDoubleDashError);
    expect(() => parseTrailingCommandArgs(["admin", "--", "--force"])).toThrow(
      RunDoubleDashError,
    );
  });

  it("无额外参数时不改动 argv", () => {
    const input = ["run", "hello/world"];
    expect(preprocessCliArgsForRun(input)).toEqual(input);
    expect(takeRunPassthrough()).toEqual([]);
  });

  it("位置参数留在命令上", () => {
    const cleaned = preprocessCliArgsForRun([
      "run",
      "user/add",
      "admin",
      "admin@qq.com",
      "13800138000",
    ]);
    expect(cleaned).toEqual([
      "run",
      "user/add",
      "admin",
      "admin@qq.com",
      "13800138000",
    ]);
    expect(takeRunPassthrough()).toEqual([]);
  });

  it("命令选项直接摘出，框架选项仍留给解析器", () => {
    const cleaned = preprocessCliArgsForRun([
      "run",
      "user/add",
      "--username",
      "admin",
      "--email",
      "admin@qq.com",
      "--phone",
      "13800138000",
      "-a",
      "console",
      "--timeout",
      "5000",
    ]);
    expect(cleaned).toEqual([
      "run",
      "user/add",
      "-a",
      "console",
      "--timeout",
      "5000",
    ]);
    expect(takeRunPassthrough()).toEqual([
      "--username",
      "admin",
      "--email",
      "admin@qq.com",
      "--phone",
      "13800138000",
    ]);
  });

  it("parseTrailingCommandArgs 应解析命名选项与位置参数", () => {
    const named = parseTrailingCommandArgs([
      "--username",
      "admin",
      "--email",
      "admin@qq.com",
      "--phone",
      "13800138000",
    ]);
    expect(named.options).toEqual({
      username: "admin",
      email: "admin@qq.com",
      phone: "13800138000",
    });
    expect(named.args).toEqual([]);

    const positional = parseTrailingCommandArgs([
      "admin",
      "admin@qq.com",
      "13800138000",
    ]);
    expect(positional.args).toEqual([
      "admin",
      "admin@qq.com",
      "13800138000",
    ]);
    expect(positional.options).toEqual({});

    const flag = parseTrailingCommandArgs(["--force", "--id", "1", "rest"]);
    expect(flag.options.force).toBe(true);
    expect(flag.options.id).toBe("1");
    expect(flag.args).toEqual(["rest"]);
  });
});

/**
 * 运行时命令工具测试
 *
 * 测试 src/utils/runtime.ts 的功能：
 * - getRuntime 返回 deno 或 bun
 * - getTaskArgs 任务参数
 * - getTestArgs 测试参数
 * - getLintArgs 格式化参数
 * - getFmtArgs 格式化参数
 * - getRunArgs 运行脚本参数
 * - envWithRuntime RUNTIME_ENV 注入
 * - isWindows 平台判断
 *
 * 注：不测试 @dreamer/runtime-adapter 的 IS_DENO/IS_BUN，仅测试本框架对返回值的处理逻辑。
 */

import "../setup.ts";
import { deleteEnv, getEnv, setEnv } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  configProfileFromRuntimeEnv,
  envWithRuntime,
  getDenoRunArgsFromTaskString,
  getFmtArgs,
  getLintArgs,
  getRunArgs,
  getRuntime,
  getSpawnArgsForDwebTask,
  getTaskArgs,
  getTestArgs,
  isWindows,
} from "../../src/utils/runtime.ts";

describe("运行时工具 (runtime.ts)", () => {
  describe("getRuntime()", () => {
    it("应返回 deno 或 bun", () => {
      const rt = getRuntime();
      expect(["deno", "bun"]).toContain(rt);
    });
  });

  describe("getTaskArgs()", () => {
    it("应返回 [task, name] 或 [run, name] 格式", () => {
      const args = getTaskArgs("dev");
      expect(args).toHaveLength(2);
      expect(args[1]).toBe("dev");
    });
  });

  describe("getDenoRunArgsFromTaskString()", () => {
    it("应解析标准 deno run 任务行", () => {
      expect(
        getDenoRunArgsFromTaskString("deno run -A src/main.ts --dev"),
      ).toEqual(["run", "-A", "src/main.ts", "--dev"]);
      expect(
        getDenoRunArgsFromTaskString(
          "  DENO  RUN  -A dist/server.js --start  ",
        ),
      ).toEqual(["run", "-A", "dist/server.js", "--start"]);
    });
    it("对非 deno run 行应返回 null", () => {
      expect(getDenoRunArgsFromTaskString("deno task dev")).toBeNull();
      expect(getDenoRunArgsFromTaskString("bun run dev")).toBeNull();
    });
  });

  describe("getSpawnArgsForDwebTask()", () => {
    it("有 deno run 行时应为直接 run 参数，否则为 task 回退", () => {
      const tasks: Record<string, string> = {
        dev: "deno run -A src/main.ts --dev",
        other: "echo done",
      };
      const a = getSpawnArgsForDwebTask("dev", tasks);
      const b = getSpawnArgsForDwebTask("other", tasks);
      expect(a[0]).toBe("run");
      expect(b).toEqual(getTaskArgs("other"));
    });
  });

  describe("getTestArgs()", () => {
    it("默认应包含 tests 路径", () => {
      const args = getTestArgs();
      expect(args.length).toBeGreaterThanOrEqual(2);
      expect(args).toContain("tests");
    });

    it("应支持自定义路径", () => {
      const args = getTestArgs("tests/unit");
      expect(args).toContain("tests/unit");
    });
  });

  describe("getLintArgs()", () => {
    it("应返回有效参数数组", () => {
      const withTask = getLintArgs(true);
      const withoutTask = getLintArgs(false);
      expect(withTask.length).toBeGreaterThanOrEqual(1);
      expect(withoutTask.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getFmtArgs()", () => {
    it("应返回有效参数数组", () => {
      const args = getFmtArgs();
      expect(args.length).toBeGreaterThanOrEqual(1);
    });

    it("useTask 为 true 时应使用 task", () => {
      const args = getFmtArgs(true);
      expect(args.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getRunArgs()", () => {
    it("应包含文件路径", () => {
      const args = getRunArgs("src/main.ts");
      expect(args).toContain("src/main.ts");
    });
  });

  describe("isWindows()", () => {
    it("应返回布尔值", () => {
      expect(typeof isWindows()).toBe("boolean");
    });
  });

  describe("envWithRuntime()", () => {
    it("应设置 RUNTIME_ENV 为 dev、build 或 start", () => {
      expect(envWithRuntime("dev").RUNTIME_ENV).toBe("dev");
      expect(envWithRuntime("build").RUNTIME_ENV).toBe("build");
      expect(envWithRuntime("start").RUNTIME_ENV).toBe("start");
    });
  });

  describe("configProfileFromRuntimeEnv()", () => {
    it("应与当前 RUNTIME_ENV（dev/build/start）一致；未设或非法时默认为 dev", () => {
      const prev = getEnv("RUNTIME_ENV");
      try {
        deleteEnv("RUNTIME_ENV");
        expect(configProfileFromRuntimeEnv()).toBe("dev");

        setEnv("RUNTIME_ENV", "build");
        expect(configProfileFromRuntimeEnv()).toBe("build");

        setEnv("RUNTIME_ENV", "start");
        expect(configProfileFromRuntimeEnv()).toBe("start");

        setEnv("RUNTIME_ENV", "bogus");
        expect(configProfileFromRuntimeEnv()).toBe("dev");
      } finally {
        if (prev !== undefined) {
          setEnv("RUNTIME_ENV", prev);
        } else {
          deleteEnv("RUNTIME_ENV");
        }
      }
    });
  });
});

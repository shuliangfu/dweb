/**
 * CLI 模块测试
 *
 * 测试 src/cli.ts：
 * - createCLI() 返回 Command 实例
 * - version / doctor / info 子命令能走到注册的 action
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  fromFileUrl,
  makeTempDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterEach, describe, expect, it } from "@dreamer/test";
import { stubExit } from "../helpers/stub-exit.ts";
import { createCLI } from "../../src/cli-factory.ts";

describe("CLI (cli.ts)", () => {
  describe("createCLI()", () => {
    it("应返回 Command 实例且包含 execute 方法", () => {
      const cli = createCLI("1.0.0");
      expect(cli).toBeDefined();
      expect(typeof cli.execute).toBe("function");
    });
  });

  describe("子命令 action", () => {
    const temps: string[] = [];
    const cwdStack: string[] = [];

    afterEach(async () => {
      while (cwdStack.length) chdir(cwdStack.pop()!);
      for (const dir of temps.splice(0)) {
        await remove(dir, { recursive: true }).catch(() => {});
      }
    });

    it("version 应打印传入的版本号", async () => {
      const cli = createCLI("9.9.9-test");
      const logs: string[] = [];
      const orig = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      };
      const stub = stubExit();
      try {
        await cli.execute(["version"]);
        throw new Error("expected exit");
      } catch (err) {
        expect(String(err)).toContain("DENO_EXIT:0");
        expect(stub.code).toBe(0);
      } finally {
        stub.restore();
        console.log = orig;
      }
      expect(logs.some((line) => line.includes("9.9.9-test"))).toBe(true);
    });

    it("doctor 在没有项目时应走命令 action", async () => {
      const dir = await makeTempDir({ prefix: "dweb-cli-doctor-" });
      temps.push(dir);
      cwdStack.push(cwd());
      chdir(dir);
      const cli = createCLI("1.0.0");
      const stub = stubExit();
      try {
        await cli.execute(["doctor"]);
      } catch (err) {
        expect(String(err)).toContain("DENO_EXIT:");
      } finally {
        stub.restore();
      }
    });

    it("info 在合法项目里应走命令 action", async () => {
      const dir = await makeTempDir({ prefix: "dweb-cli-info-" });
      temps.push(dir);
      await writeTextFile(
        `${dir}/deno.json`,
        JSON.stringify({
          name: "tmp",
          version: "0.0.1",
          tasks: { dev: "echo" },
        }),
      );
      cwdStack.push(cwd());
      chdir(dir);
      const cli = createCLI("1.0.0");
      const stub = stubExit();
      try {
        await cli.execute(["info"]);
      } catch (err) {
        // info 正常路径可能不 exit，也可能 exit
        expect(String(err)).toContain("DENO_EXIT:");
      } finally {
        stub.restore();
      }
    });
  });

  describe("启动模块图", () => {
    it("cli.ts 不含会把命令树预装进启动图的静态可分析 import", async () => {
      const text = await readTextFile(
        fromFileUrl(new URL("../../src/cli.ts", import.meta.url)),
      );
      expect(text.includes('import("@dreamer/runtime-adapter")')).toBe(false);
      expect(text.includes('from "@dreamer/runtime-adapter"')).toBe(false);
      expect(text.includes('import("./cli-factory.ts")')).toBe(false);
      expect(text.includes('import("./utils/main-module.ts")')).toBe(false);
      expect(text.includes('import("./utils/run-passthrough.ts")')).toBe(false);
    });
  });
});

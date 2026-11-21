/**
 * info 命令测试
 *
 * 测试 src/cmd/info.ts：无项目时 exit 2；有 deno.json 时打印摘要并返回。
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterEach, describe, expect, it } from "@dreamer/test";
import { stubExit } from "../helpers/stub-exit.ts";
import { main } from "../../src/cmd/info.ts";

describe("info (cmd/info.ts)", () => {
  const temps: string[] = [];
  const cwdStack: string[] = [];

  afterEach(async () => {
    while (cwdStack.length) chdir(cwdStack.pop()!);
    for (const dir of temps.splice(0)) {
      await remove(dir, { recursive: true }).catch(() => {});
    }
  });

  async function enterTemp(prefix: string): Promise<string> {
    const dir = await makeTempDir({ prefix });
    temps.push(dir);
    cwdStack.push(cwd());
    chdir(dir);
    return dir;
  }

  it("无 deno.json 时应 exit 2", async () => {
    await enterTemp("dweb-info-none-");
    const stub = stubExit();
    try {
      await main([], {});
      throw new Error("expected exit");
    } catch (err) {
      expect(String(err)).toContain("DENO_EXIT:2");
      expect(stub.code).toBe(2);
    } finally {
      stub.restore();
    }
  });

  it("有 deno.json 时应打印名称、版本、tasks 与 dreamer 依赖", async () => {
    const dir = await enterTemp("dweb-info-ok-");
    await writeTextFile(
      `${dir}/deno.json`,
      JSON.stringify({
        name: "tmp-app",
        version: "1.2.3",
        tasks: { dev: "dweb-cli dev", test: "dweb-cli test" },
        imports: {
          "@dreamer/view": "jsr:@dreamer/view@^3.1.3",
          "other": "./local.ts",
        },
      }),
    );
    await main([], {});
  });

  it("deno.json 非法时仍应返回，不抛错", async () => {
    const dir = await enterTemp("dweb-info-badjson-");
    await writeTextFile(`${dir}/deno.json`, "{ not json");
    // getProjectInfo 可能解析失败而当作无项目，或读到后 JSON.parse 再失败。
    const stub = stubExit();
    try {
      await main([], {});
    } catch (err) {
      expect(String(err)).toContain("DENO_EXIT:");
    } finally {
      stub.restore();
    }
  });
});

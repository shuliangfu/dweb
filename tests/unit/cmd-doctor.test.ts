/**
 * doctor 命令测试
 *
 * 测试 src/cmd/doctor.ts：无项目时 exit 2；有项目但缺依赖／锁时 exit 1；
 * 依赖与锁齐全时正常返回。
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
import { main } from "../../src/cmd/doctor.ts";


describe("doctor (cmd/doctor.ts)", () => {
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
    await enterTemp("dweb-doctor-none-");
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

  it("有 deno.json 但缺依赖和锁文件时应 exit 1", async () => {
    const dir = await enterTemp("dweb-doctor-fail-");
    await writeTextFile(
      `${dir}/deno.json`,
      JSON.stringify({
        name: "tmp-app",
        version: "0.0.1",
      }),
    );
    const stub = stubExit();
    try {
      await main([], {});
      throw new Error("expected exit");
    } catch (err) {
      expect(String(err)).toContain("DENO_EXIT:1");
      expect(stub.code).toBe(1);
    } finally {
      stub.restore();
    }
  });

  it("依赖与锁文件齐全时应正常返回", async () => {
    const dir = await enterTemp("dweb-doctor-ok-");
    await writeTextFile(
      `${dir}/deno.json`,
      JSON.stringify({
        name: "tmp-app",
        version: "0.0.1",
        imports: {
          "@dreamer/view": "jsr:@dreamer/view@^3.1.3",
          "@dreamer/render": "jsr:@dreamer/render@^1.5.6",
          "@dreamer/server": "jsr:@dreamer/server@^1.0.0",
          "@dreamer/upload": "jsr:@dreamer/upload@^2.0.1",
        },
      }),
    );
    await writeTextFile(`${dir}/deno.lock`, JSON.stringify({ version: "4" }));
    await main([], {});
  });
});

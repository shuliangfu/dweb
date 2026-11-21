/**
 * run 命令测试
 *
 * 测试 src/cmd/run.ts 的主入口早退分支：缺路由、--list 列出空命令、
 * 多应用项目找不到 console 目录。
 * 设置 DWEB_CLI_WITH_PROJECT_CONFIG=1，避免触发 import map 子进程重跑。
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  makeTempDir,
  mkdir,
  remove,
  setEnv,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@dreamer/test";
import { stubExit } from "../helpers/stub-exit.ts";
import { main } from "../../src/cmd/run.ts";
import { PROJECT_CONFIG_ENV } from "../../src/utils/project-import-map.ts";

describe("run (cmd/run.ts)", () => {
  const temps: string[] = [];
  const cwdStack: string[] = [];

  beforeAll(() => {
    setEnv(PROJECT_CONFIG_ENV, "1");
  });

  afterEach(async () => {
    while (cwdStack.length) chdir(cwdStack.pop()!);
    for (const dir of temps.splice(0)) {
      await remove(dir, { recursive: true }).catch(() => {});
    }
  });

  afterAll(() => {
    setEnv(PROJECT_CONFIG_ENV, "1");
  });

  async function enterTemp(prefix: string, denoJson: unknown): Promise<string> {
    const dir = await makeTempDir({ prefix });
    temps.push(dir);
    await writeTextFile(`${dir}/deno.json`, JSON.stringify(denoJson));
    cwdStack.push(cwd());
    chdir(dir);
    return dir;
  }

  it("缺少路由名时应 exit 2", async () => {
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

  it("--list 在单应用且没有命令时应 exit 0", async () => {
    await enterTemp("dweb-run-list-empty-", {
      name: "tmp",
      version: "0.0.1",
    });
    const stub = stubExit();
    try {
      await main([], { list: true });
      throw new Error("expected exit");
    } catch (err) {
      expect(String(err)).toContain("DENO_EXIT:0");
      expect(stub.code).toBe(0);
    } finally {
      stub.restore();
    }
  });

  it("--list 在多应用项目找不到 console 目录时应 exit 2", async () => {
    await enterTemp("dweb-run-list-multi-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "dev:web": "dweb-cli dev" },
    });
    const stub = stubExit();
    try {
      await main([], { list: true });
      throw new Error("expected exit");
    } catch (err) {
      expect(String(err)).toContain("DENO_EXIT:2");
      expect(stub.code).toBe(2);
    } finally {
      stub.restore();
    }
  });
  it("--list 应读取 config/main.ts 里声明的 routesDir 后 exit 0", async () => {
    const dir = await enterTemp("dweb-run-list-routesdir-", {
      name: "tmp",
      version: "0.0.1",
    });
    await mkdir(`${dir}/config`, { recursive: true });
    await mkdir(`${dir}/custom-routes`, { recursive: true });
    await writeTextFile(
      `${dir}/config/main.ts`,
      'export default { kind: "console", router: {}, routesDir: "custom-routes" };\n',
    );
    const stub = stubExit();
    try {
      await main([], { list: true });
      throw new Error("expected exit");
    } catch (err) {
      expect(String(err)).toContain("DENO_EXIT:0");
      expect(stub.code).toBe(0);
    } finally {
      stub.restore();
    }
  });

  it("指定路由但多应用项目找不到 console 目录时应 exit 2", async () => {
    await enterTemp("dweb-run-missing-console-", {
      name: "tmp",
      version: "0.0.1",
      tasks: { "dev:web": "dweb-cli dev" },
    });
    const stub = stubExit();
    try {
      await main(["hello/world"], {});
      throw new Error("expected exit");
    } catch (err) {
      expect(String(err)).toContain("DENO_EXIT:2");
      expect(stub.code).toBe(2);
    } finally {
      stub.restore();
    }
  });
});

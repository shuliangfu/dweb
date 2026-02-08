/**
 * CLI 配置加载器测试
 *
 * 测试 src/utils/config-loader.ts 的功能：
 * - loadProjectConfig 加载项目配置
 * - 指定 app 时加载对应应用配置
 * - 未指定 app 时扫描 config 目录
 *
 * 注：不测试 @dreamer/runtime-adapter 的文件系统，仅测试本框架的加载逻辑。
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { loadProjectConfig } from "../../src/utils/config-loader.ts";

describe("loadProjectConfig (config-loader.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-config-loader-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("无 config 目录时应返回空对象", async () => {
    const config = await loadProjectConfig(testDir);
    expect(config).toEqual({});
  });

  it("有 config/main.ts 时应加载配置", async () => {
    const configDir = join(testDir, "config");
    await ensureDir(configDir);
    await writeTextFile(
      join(configDir, "main.ts"),
      `export default { name: "test-app", version: "1.0.0" };`,
    );

    const config = await loadProjectConfig(testDir);
    expect(config.name).toBe("test-app");
    expect(config.version).toBe("1.0.0");
  });

  it("指定 app 时加载 src/{app}/config", async () => {
    const appConfigDir = join(testDir, "src", "backend", "config");
    await ensureDir(appConfigDir);
    await writeTextFile(
      join(appConfigDir, "main.ts"),
      `export default { name: "backend", server: { port: 4000 } };`,
    );

    const config = await loadProjectConfig(testDir, "backend");
    expect(config.name).toBe("backend");
    expect((config.server as { port?: number })?.port).toBe(4000);
  });
});

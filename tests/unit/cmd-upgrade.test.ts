/**
 * upgrade 命令测试
 *
 * 测试 src/cmd/upgrade.ts：
 * - main 能正常执行（检查版本、可能提示已是最新）
 * - 升级安装时使用的 spawn 选项（stdin: "null"）不会导致卡住
 * - 实际执行 setup 安装命令，验证不卡住且安装成功
 */

import { createCommand, join } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import { main } from "../../src/cmd/upgrade.ts";
import { getRunArgs, getRuntime } from "../../src/utils/runtime.ts";
import { getRepoRoot } from "../setup.ts";
import "../setup.ts";

describe("upgrade (cmd/upgrade.ts)", () => {
  it("应能正常执行不抛错", async () => {
    await main([], {});
  });

  it("--beta 选项时应能正常执行", async () => {
    await main([], { beta: true });
  });

  /**
   * 模拟 upgrade 中「发现新版本后 spawn setup」的用法：stdin: "null" + 等待 status。
   * 用立即退出的子进程验证该模式不会卡住（超时内能拿到 status 即通过）。
   */
  it("spawn 使用 stdin null 时子进程立即退出不会卡住", async () => {
    const runtime = getRuntime();
    const noopArgs = runtime === "deno"
      ? ["run", "-A", "eval", "0"]
      : ["-e", "process.exit(0)"];
    const cmd = createCommand(runtime, {
      args: noopArgs,
      stdout: "null",
      stderr: "null",
      stdin: "null",
    });
    const child = cmd.spawn();
    const timeoutMs = 5000;
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("spawn 卡住未在限定时间内完成")),
        timeoutMs,
      );
    });
    const status = await Promise.race([child.status, timeoutPromise]).finally(
      () => clearTimeout(timeoutId!),
    );
    child.unref();
    // 不卡住即通过；仅断言在超时内拿到了 status（子进程已结束）
    expect(status).toBeDefined();
    expect(typeof (status as { success?: boolean }).success).toBe("boolean");
  });

  /**
   * 实际执行本地 src/setup.ts（与 upgrade 相同 spawn 选项）。
   * 用本地代码保证 setup 内 deno install 也是 stdin: "null"，避免卡住；JSR 已发布版本尚未含此修复。
   */
  it("实际执行 setup 安装命令不卡住且成功", async () => {
    const runtime = getRuntime();
    const repoRoot = getRepoRoot();
    const setupPath = join(repoRoot, "src", "setup.ts");
    const cmd = createCommand(runtime, {
      args: getRunArgs(setupPath),
      cwd: repoRoot,
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });
    const child = cmd.spawn();
    const timeoutMs = 60_000; // 实际安装约 10–20 秒，留足余量
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("安装命令在限定时间内未完成")),
        timeoutMs,
      );
    });
    const status = await Promise.race([child.status, timeoutPromise]).finally(
      () => clearTimeout(timeoutId!),
    );
    child.unref();
    expect(status).toBeDefined();
    expect((status as { success: boolean }).success).toBe(true);
  });
});

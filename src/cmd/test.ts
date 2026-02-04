/**
 * dweb test 命令
 *
 * 职责：
 * - 运行测试
 * - 优先执行 deno task test，若不存在则执行 deno test -A tests
 *
 * 运行方式：
 * - dweb test              # 单应用
 * - dweb test -a backend   # 多应用，运行 backend 测试
 */

import { error, info, success } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getRuntime, getTaskArgs, getTestArgs } from "../utils/runtime.ts";

/**
 * test 命令主入口
 *
 * @param args 命令行参数，多应用时第一个参数可为应用名
 * @param options 解析后的选项，可含 app
 */
export async function main(
  args: string[],
  options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error("未找到 deno.json，请在 dweb 项目根目录执行");
    return;
  }

  const app = (options.app as string) ?? args[0];

  if (projectInfo.mode === "single" || !app) {
    const taskName = "test";
    if (projectInfo.tasks[taskName]) {
      info("正在运行测试...");
      const cmd = createCommand(getRuntime(), {
        args: getTaskArgs(taskName),
        cwd: projectRoot,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
      const child = cmd.spawn();
      const status = await child.status;
      if (status.success) {
        success("测试完成");
      } else {
        error(`test 命令退出码: ${status.code ?? "未知"}`);
      }
      return;
    }
    // 无 test task，直接运行测试
    info("正在运行测试...");
    const cmd = createCommand(getRuntime(), {
      args: getTestArgs("tests"),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success("测试完成");
    } else {
      error(`test 命令退出码: ${status.code ?? "未知"}`);
    }
    return;
  }

  // 多应用，指定了 app
  if (!projectInfo.appNames.includes(app)) {
    error(`未找到应用 "${app}"`);
    error(`可用应用: ${projectInfo.appNames.join(", ")}`);
    return;
  }

  const taskName = `test:${app}`;
  if (projectInfo.tasks[taskName]) {
    info(`正在运行 ${app} 测试...`);
    const cmd = createCommand(getRuntime(), {
      args: getTaskArgs(taskName),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success(`${app} 测试完成`);
    } else {
      error(`${app} 测试失败，退出码: ${status.code ?? "未知"}`);
    }
  } else {
    error(`deno.json 中未定义 "${taskName}" task`);
    error("请添加 test 或 test:应用名 task");
  }
}

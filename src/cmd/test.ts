/**
 * dweb test 命令（产品层 launcher）
 *
 * 职责：
 * - 统一入口：`dweb-cli test`（用户无需手写 `deno test` / `bun test`）
 * - 拼装宿主参数并 spawn；用例 API 仍由 `@dreamer/test` 在测试文件中提供
 * - 优先 `tasks.test` / `test:<app>`（无产品 flag 时）；否则 `getTestArgs(...)`
 *
 * 运行方式：
 * - dweb-cli test
 * - dweb-cli test tests/unit
 * - dweb-cli test --unit
 * - dweb-cli test --filter "chunk"
 * - dweb-cli test --coverage
 * - dweb-cli test --runtime deno|bun
 * - dweb-cli test -a backend
 */

import { error, info, success } from "@dreamer/console";
import { createCommand, cwd, exit } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { $tr } from "../utils/i18n.ts";
import { getProjectInfo } from "../utils/project.ts";
import {
  getRuntime,
  getTaskArgs,
  getTestArgs,
  type HostTestRuntime,
} from "../utils/runtime.ts";
import {
  parseTestRuntime,
  resolveTestLayers,
  resolveTestPaths,
  shouldPreferTestTask,
  splitAppAndPaths,
} from "../utils/test-launcher.ts";

/**
 * 读取 CLI 选项中的 coverage：boolean 或目录字符串
 */
function readCoverageOption(
  options: ParsedOptions,
): boolean | string | undefined {
  const raw = options.coverage;
  if (raw === true) return true;
  if (typeof raw === "string" && raw.length > 0) return raw;
  return undefined;
}

/**
 * 解析宿主：`--runtime` 覆盖，否则 `getRuntime()`
 */
function resolveHostRuntime(
  options: ParsedOptions,
): HostTestRuntime | null {
  const parsed = parseTestRuntime(options.runtime);
  if (parsed.invalid) {
    error(
      $tr("test.invalidRuntime", { value: parsed.invalid }),
    );
    return null;
  }
  if (parsed.runtime) return parsed.runtime;
  return getRuntime();
}

/**
 * spawn 宿主/task 并统一退出码（失败时 `exit(code)`，成功返回）
 *
 * @param formatFailed 根据子进程退出码生成失败文案
 */
async function spawnAndReport(
  host: HostTestRuntime,
  spawnArgs: string[],
  projectRoot: string,
  messages: {
    running: string;
    complete: string;
    formatFailed: (code: string) => string;
  },
  verbose: boolean,
): Promise<void> {
  if (verbose) {
    info($tr("test.spawnCommand", { cmd: `${host} ${spawnArgs.join(" ")}` }));
  }
  info(messages.running);
  const cmd = createCommand(host, {
    args: spawnArgs,
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (status.success) {
    success(messages.complete);
    return;
  }
  const code = String(status.code ?? "?");
  error(messages.formatFailed(code));
  exit(status.code ?? 1);
}

/**
 * test 命令主入口
 *
 * @param args 位置参数：可选 app 名、测试路径
 * @param options 解析后的选项（app / unit / filter / coverage / runtime 等）
 */
export async function main(
  args: string[],
  options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error($tr("common.noDenoJson"));
    return;
  }

  const host = resolveHostRuntime(options);
  if (!host) return;

  const verbose = options.verbose === true;
  const filter = typeof options.filter === "string" && options.filter.length > 0
    ? options.filter
    : undefined;
  const coverage = readCoverageOption(options);
  const layers = resolveTestLayers({
    unit: options.unit === true,
    integration: options.integration === true,
    e2e: options.e2e === true,
  });

  const { app, paths: positionalPaths } = splitAppAndPaths(
    args,
    typeof options.app === "string" ? options.app : undefined,
    projectInfo.appNames,
  );

  const paths = resolveTestPaths(positionalPaths, layers);
  const preferTask = shouldPreferTestTask({
    paths,
    layers,
    filter,
    coverage,
  });

  // 多应用：指定 app 时校验
  if (app) {
    if (projectInfo.mode === "multi" && !projectInfo.appNames.includes(app)) {
      error($tr("common.appNotFound", { app }));
      error(
        $tr("common.availableApps", {
          apps: projectInfo.appNames.join(", "),
        }),
      );
      return;
    }

    const taskName = `test:${app}`;
    if (preferTask && projectInfo.tasks[taskName]) {
      await spawnAndReport(
        host,
        getTaskArgs(taskName),
        projectRoot,
        {
          running: $tr("test.runningWithApp", { app }),
          complete: $tr("test.appComplete", { app }),
          formatFailed: (code) => $tr("test.appFailed", { app, code }),
        },
        verbose,
      );
      return;
    }

    // 无 task 或有产品 flag：直接宿主测试（路径仍为 tests/ 或用户指定）
    if (preferTask && !projectInfo.tasks[taskName]) {
      // 兼容：提示可配置 task，但仍尝试默认路径
      info($tr("test.noAppTaskFallback", { task: taskName }));
    }

    await spawnAndReport(
      host,
      getTestArgs({ paths, filter, coverage }, host),
      projectRoot,
      {
        running: $tr("test.runningWithApp", { app }),
        complete: $tr("test.appComplete", { app }),
        formatFailed: (code) => $tr("test.appFailed", { app, code }),
      },
      verbose,
    );
    return;
  }

  // 单应用 / 未指定 app
  if (preferTask && projectInfo.tasks.test) {
    await spawnAndReport(
      host,
      getTaskArgs("test"),
      projectRoot,
      {
        running: $tr("test.running"),
        complete: $tr("test.complete"),
        formatFailed: (code) => $tr("test.exitCode", { code }),
      },
      verbose,
    );
    return;
  }

  await spawnAndReport(
    host,
    getTestArgs({ paths, filter, coverage }, host),
    projectRoot,
    {
      running: $tr("test.running"),
      complete: $tr("test.complete"),
      formatFailed: (code) => $tr("test.exitCode", { code }),
    },
    verbose,
  );
}

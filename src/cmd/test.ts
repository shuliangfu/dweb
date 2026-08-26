/**
 * dweb test 命令（产品层 launcher）
 *
 * 职责：
 * - 统一入口：`dweb-cli test`（用户无需手写 `deno test` / `bun test`）
 * - 拼装宿主参数并 spawn；用例 API 仍由 `@dreamer/test` 在测试文件中提供
 * - 优先 `tasks.test` / `test:<app>`（无产品 flag 时）；否则 `getTestArgs(...)`
 * - L1.5-b：`--report json,md,html` 解析宿主 JUnit → 产品报告
 *
 * 运行方式：
 * - dweb-cli test
 * - dweb-cli test tests/unit
 * - dweb-cli test --unit
 * - dweb-cli test --filter "chunk"
 * - dweb-cli test --coverage
 * - dweb-cli test --runtime deno|bun
 * - dweb-cli test --report json,md --report-dir reports
 * - dweb-cli test -a backend
 */

import { error, info, success } from "@dreamer/console";
import {
  createCommand,
  cwd,
  exit,
  makeTempFile,
  readTextFile,
} from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { $tr } from "../utils/i18n.ts";
import { getProjectInfo } from "../utils/project.ts";
import {
  describeUnsupportedTestReporter,
  getRuntime,
  getTaskArgs,
  getTestArgs,
  type HostTestReporter,
  type HostTestRuntime,
  parseTestReporter,
} from "../utils/runtime.ts";
import {
  parseTestRuntime,
  resolveTestLayers,
  resolveTestPaths,
  shouldPreferTestTask,
  splitAppAndPaths,
} from "../utils/test-launcher.ts";
import {
  parseJUnitXml,
  parseProductReportFormats,
  type ProductReportFormat,
  writeTestReports,
} from "../utils/test-report.ts";

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
 * spawn 宿主/task；返回退出码（成功 0）。不在此处 exit，便于写完产品报告再退出。
 */
async function spawnTestProcess(
  host: HostTestRuntime,
  spawnArgs: string[],
  projectRoot: string,
  messages: {
    running: string;
    complete: string;
    formatFailed: (code: string) => string;
  },
  verbose: boolean,
): Promise<number> {
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
    return 0;
  }
  const code = status.code ?? 1;
  error(messages.formatFailed(String(code)));
  return code;
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

  if (host === "node") {
    const productProbe = parseProductReportFormats(options.report);
    if (productProbe.formats?.length) {
      error($tr("test.productReportNodeUnsupported"));
      return;
    }
  }

  const verbose = options.verbose === true;
  const filter = typeof options.filter === "string" && options.filter.length > 0
    ? options.filter
    : undefined;
  const coverage = readCoverageOption(options);
  const reportOut =
    typeof options["report-out"] === "string" && options["report-out"].length > 0
      ? options["report-out"]
      : typeof options.junitPath === "string" && options.junitPath.length > 0
      ? options.junitPath
      : typeof options["junit-path"] === "string" &&
          options["junit-path"].length > 0
      ? options["junit-path"]
      : undefined;
  const reporterParsed = parseTestReporter(options.reporter);
  if (reporterParsed.invalid) {
    error(
      $tr("test.invalidReporter", { value: reporterParsed.invalid }),
    );
    return;
  }
  let reporter: HostTestReporter | undefined = reporterParsed.reporter;
  if (reporter) {
    const unsupported = describeUnsupportedTestReporter(
      reporter,
      reportOut,
      host,
    );
    if (unsupported) {
      error(unsupported);
      return;
    }
  } else if (reportOut) {
    error("--report-out requires --reporter junit");
    return;
  }

  const productParsed = parseProductReportFormats(options.report);
  if (productParsed.invalid) {
    error(
      $tr("test.invalidProductReport", { value: productParsed.invalid }),
    );
    return;
  }
  const productFormats: ProductReportFormat[] | undefined =
    productParsed.formats;
  const reportDir =
    typeof options["report-dir"] === "string" &&
      options["report-dir"].length > 0
      ? options["report-dir"]
      : typeof options.reportDir === "string" && options.reportDir.length > 0
      ? options.reportDir
      : "reports";

  let junitPath = reportOut;
  let tempJunit = false;
  if (productFormats?.length) {
    if (reporter && reporter !== "junit") {
      error($tr("test.productReportRequiresJunit"));
      return;
    }
    reporter = "junit";
    if (!junitPath) {
      junitPath = await makeTempFile({ prefix: "dweb-junit-", suffix: ".xml" });
      tempJunit = true;
    }
  }

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
    reporter,
    reportOut: junitPath,
    productReport: !!productFormats?.length,
  });

  const messagesForApp = app
    ? {
      running: $tr("test.runningWithApp", { app }),
      complete: $tr("test.appComplete", { app }),
      formatFailed: (code: string) => $tr("test.appFailed", { app, code }),
    }
    : {
      running: $tr("test.running"),
      complete: $tr("test.complete"),
      formatFailed: (code: string) => $tr("test.exitCode", { code }),
    };

  let exitCode = 0;

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
      exitCode = await spawnTestProcess(
        host,
        getTaskArgs(taskName),
        projectRoot,
        messagesForApp,
        verbose,
      );
    } else {
      if (preferTask && !projectInfo.tasks[taskName]) {
        info($tr("test.noAppTaskFallback", { task: taskName }));
      }
      exitCode = await spawnTestProcess(
        host,
        getTestArgs({
          paths,
          filter,
          coverage,
          reporter,
          reportOut: junitPath,
        }, host),
        projectRoot,
        messagesForApp,
        verbose,
      );
    }
  } else if (preferTask && projectInfo.tasks.test) {
    exitCode = await spawnTestProcess(
      host,
      getTaskArgs("test"),
      projectRoot,
      messagesForApp,
      verbose,
    );
  } else {
    exitCode = await spawnTestProcess(
      host,
      getTestArgs({
        paths,
        filter,
        coverage,
        reporter,
        reportOut: junitPath,
      }, host),
      projectRoot,
      messagesForApp,
      verbose,
    );
  }

  if (productFormats?.length && junitPath) {
    try {
      const xml = await readTextFile(junitPath);
      const summary = parseJUnitXml(xml);
      const written = await writeTestReports(
        summary,
        productFormats,
        reportDir,
      );
      success(
        $tr("test.productReportWritten", { paths: written.join(", ") }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      error($tr("test.productReportFailed", { message: msg }));
      if (exitCode === 0) exitCode = 1;
    }
  }

  // temp junit 留给 OS 清理；显式 --report-out 保留
  void tempJunit;

  if (exitCode !== 0) {
    exit(exitCode);
  }
}

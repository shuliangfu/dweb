/**
 * CLI 工具入口
 * 使用 Command 类提供 dev、build、start 命令
 *
 * @module
 */

import { loadConfig } from "./core/config.ts";
import { startDevServer } from "./server/dev.ts";
import { build } from "./server/build/build.ts";
import { startProdServer } from "./server/prod.ts";
import { Command } from "./server/console/command.ts";
import { info, success } from "./server/console/output.ts";
import { interactiveMenu } from "./server/console/prompt.ts";
import { readDenoJson } from "./server/utils/file.ts";
import { initEnv } from "./features/env.ts";

initEnv();

/**
 * 尝试从指定路径读取版本号
 * @param dir 目录路径
 * @param packageName 包名称（可选，用于验证）
 * @returns 版本号或 null
 */
async function tryReadVersion(
  dir: string,
  packageName?: string,
): Promise<string | null> {
  try {
    const denoJson = await readDenoJson(dir);
    if (denoJson && denoJson.version) {
      if (!packageName || denoJson.name === packageName) {
        return denoJson.version;
      }
    }
  } catch {
    // 忽略错误
  }
  return null;
}

/**
 * 从 JSR URL 中提取版本号
 * @param url 模块 URL
 * @returns 版本号或 null
 */
function extractVersionFromJsrUrl(url: URL): string | null {
  if (url.protocol === "https:" || url.protocol === "http:") {
    // JSR 格式：/@dreamer/dweb/1.4.5/src/cli.ts
    const jsrMatch = url.pathname.match(/\/@[\w-]+\/[\w-]+\/([\d.]+)\//);
    if (jsrMatch && jsrMatch[1]) {
      return jsrMatch[1];
    }
  }
  return null;
}

/**
 * 自动获取框架版本号
 * 从框架的 deno.json 文件中读取版本号
 * @returns 版本号字符串
 */
async function getFrameworkVersion(): Promise<string> {
  const currentFileUrl = new URL(import.meta.url);

  // 方法0: 尝试从 JSR URL 的路径中提取版本号（更详细的匹配）
  // JSR URL 格式可能是：https://jsr.io/@dreamer/dweb/2.0.7-beta.3/src/cli.ts
  if (currentFileUrl.protocol.startsWith("http")) {
    // 尝试匹配更详细的 JSR 路径格式
    const jsrDetailedMatch = currentFileUrl.pathname.match(
      /\/@[\w-]+\/[\w-]+\/([\d.]+(?:-[\w.]+)?)\//,
    );
    if (jsrDetailedMatch && jsrDetailedMatch[1]) {
      return jsrDetailedMatch[1];
    }
  }

  // 方法1: 从 JSR URL 中提取版本号（如果是从 JSR 导入）
  const jsrVersion = extractVersionFromJsrUrl(currentFileUrl);
  if (jsrVersion) {
    return jsrVersion;
  }

  // 方法2: 从当前文件位置向上查找 deno.json
  if (currentFileUrl.protocol === "file:") {
    let filePath = currentFileUrl.pathname;
    // Windows 路径处理
    if (Deno.build.os === "windows" && filePath.startsWith("/")) {
      filePath = filePath.substring(1);
    }
    const currentDir = filePath.substring(0, filePath.lastIndexOf("/"));

    // 尝试从 src/cli.ts 向上查找
    const parentDir = `${currentDir}/..`;
    const parentVersion = await tryReadVersion(parentDir, "@dreamer/dweb");
    if (parentVersion) return parentVersion;

    // 尝试查找 example 目录
    const exampleDir = `${currentDir}/../example`;
    const exampleVersion = await tryReadVersion(exampleDir);
    if (exampleVersion) return exampleVersion;
  }

  // 方法3: 从当前工作目录读取
  const cwd = Deno.cwd();
  const cwdVersion = await tryReadVersion(cwd, "@dreamer/dweb");
  if (cwdVersion) return cwdVersion;

  // 方法4: 尝试从 example 目录读取
  const exampleCwdVersion = await tryReadVersion(`${cwd}/example`);
  if (exampleCwdVersion) return exampleCwdVersion;

  // 方法5: 如果当前在 example 目录
  if (cwd.endsWith("example")) {
    const exampleVersion = await tryReadVersion(cwd);
    if (exampleVersion) return exampleVersion;
  }

  // 如果都找不到，返回未知版本
  return "unknown";
}

// 获取框架版本号
const frameworkVersion = await getFrameworkVersion();

/**
 * 加载配置文件（用于检测多应用模式）
 * @returns 配置对象或 null
 */
async function loadConfigForDetection(): Promise<any | null> {
  try {
    const result = await loadConfig(undefined, undefined);
    return result.config;
  } catch (loadError) {
    // 如果是多应用模式但未指定应用的错误，说明确实是多应用模式
    if (
      loadError instanceof Error && loadError.message.includes("多应用模式下")
    ) {
      // 直接读取配置文件来获取应用列表
      const { findConfigFile } = await import("./server/utils/file.ts");
      const configPath = await findConfigFile();
      if (!configPath) {
        return null;
      }

      // 动态导入配置文件
      const configUrl = new URL(configPath, `file://${Deno.cwd()}/`).href;
      // @ts-ignore - 动态导入配置文件，类型由运行时确定
      const configModule = await import(configUrl);
      return configModule.default || configModule;
    }
    // 其他错误，返回 null
    return null;
  }
}

/**
 * 交互式选择应用
 * @param apps 应用列表
 * @returns 选中的应用名称
 */
async function selectAppInteractively(
  apps: Array<{ name?: string }>,
): Promise<string> {
  if (apps.length === 0) {
    throw new Error("多应用模式下未找到任何应用配置");
  }

  // 如果只有一个应用，直接返回
  if (apps.length === 1) {
    const appPath = (apps[0] as any).path || apps[0].name;
    if (appPath) {
      info(`自动选择应用: ${appPath}`);
      return appPath;
    }
  }

  // 多个应用，让用户选择
  // 优先使用 path，如果没有 path 则使用 name（向后兼容）
  const appPaths = apps
    .map((app) => (app as any).path || app.name)
    .filter((p): p is string => !!p);

  if (appPaths.length === 0) {
    throw new Error("多应用模式下未找到有效的应用路径或名称");
  }

  // 显示应用列表供用户选择
  const selectedIndex = await interactiveMenu(
    "检测到多应用模式，请选择要操作的应用：",
    appPaths,
  );

  return appPaths[selectedIndex];
}

/**
 * 解析应用名称
 * 支持格式：dev:app-name 或通过 --app 选项
 * 如果是多应用模式且未指定应用，则交互式选择
 * @param args 命令行参数
 * @param options 解析后的选项
 * @returns 应用名称（如果未指定则返回 undefined）
 */
async function parseAppName(
  args: string[],
  options: Record<string, any>,
): Promise<string | undefined> {
  // 优先使用 --app 选项
  if (options.app) {
    return options.app as string;
  }

  // 检查第一个参数是否包含冒号（兼容旧格式 dev:app-name）
  if (args.length > 0 && args[0].includes(":")) {
    const parts = args[0].split(":");
    if (parts.length === 2) {
      return parts[1];
    }
  }

  // 如果没有指定应用名称，检查是否为多应用模式
  const config = await loadConfigForDetection();
  if (!config) {
    return undefined;
  }

  const isMultiApp = "apps" in config && Array.isArray(config.apps);
  if (isMultiApp) {
    try {
      return await selectAppInteractively(config.apps || []);
    } catch (error) {
      // 如果是多应用模式相关的错误，重新抛出
      if (error instanceof Error && error.message.includes("多应用模式")) {
        throw error;
      }
      // 其他错误，返回 undefined
      return undefined;
    }
  }

  return undefined;
}

/**
 * 公共的应用选项定义
 */
const appOption = {
  name: "app",
  alias: "a",
  description: "应用名称（多应用模式）",
  requiresValue: true,
} as const;

/**
 * 加载配置并更新服务器设置
 * @param appName 应用名称
 * @param options 命令行选项
 * @returns 配置对象
 */
async function loadConfigWithServerOptions(
  appName: string | undefined,
  options: Record<string, any>,
): Promise<any> {
  const { config } = await loadConfig(undefined, appName);

  // 更新服务器配置（只在用户明确指定时才覆盖）
  // 注意：由于移除了 defaultValue，如果用户未指定选项，options 中对应的值会是 undefined
  if (!config.server) {
    config.server = {};
  }

  // 只在用户明确指定时才覆盖配置
  if (options.port !== undefined) {
    config.server.port = parseInt(options.port as string, 10);
  }

  if (options.host !== undefined) {
    config.server.host = options.host as string;
  }

  return config;
}

/**
 * 显示应用名称和框架版本信息
 * @param appName 应用名称
 */
function displayAppName(appName: string | undefined): void {
  // 显示框架版本号，方便确认是否使用了旧版本的缓存
  info(`框架版本: ${frameworkVersion}`);
  if (appName) {
    info(`应用: ${appName}`);
  }
}

// 创建主命令
const cli = new Command("dweb", "DWeb 框架 CLI 工具")
  .setVersion(frameworkVersion)
  .setUsage(
    "deno run -A src/cli.ts <command> [选项]\n  deno run -A src/cli.ts <command>:<app-name>  # 旧格式（兼容）",
  )
  .example(
    "deno run -A src/cli.ts dev --app my-app",
    "启动开发服务器并指定应用",
  )
  .example(
    "deno run -A src/cli.ts build --minify",
    "监听文件变化并自动重新构建并压缩输出文件",
  )
  .example(
    "deno run -A src/cli.ts start --port 8080",
    "启动生产服务器并指定端口号和主机地址",
  );

// dev 子命令：启动开发服务器
cli.command("dev", "启动开发服务器")
  .keepAlive()
  .option(appOption)
  .option({
    name: "port",
    alias: "p",
    description: "端口号",
    requiresValue: true,
  })
  .option({
    name: "host",
    description: "主机地址",
    requiresValue: true,
  })
  .option({
    name: "open",
    alias: "o",
    description: "自动打开浏览器",
  })
  .action(async (args, options) => {
    const appName = await parseAppName(args, options);
    displayAppName(appName);
    // 加载配置并更新服务器设置
    const config = await loadConfigWithServerOptions(appName, options);

    // 如果指定了自动打开浏览器，更新配置
    if (options.open === true) {
      if (!config.dev) {
        config.dev = {};
      }
      config.dev.open = true;
    }
    // 启动开发服务器
    await startDevServer(config);
  });

// build 子命令：构建生产版本
cli.command("build", "构建生产版本")
  .option(appOption)
  .option({
    name: "watch",
    alias: "w",
    description: "监听文件变化并自动重新构建",
  })
  .option({
    name: "minify",
    alias: "m",
    description: "压缩输出文件",
    defaultValue: true,
  })
  .action(async (args, options) => {
    const appName = await parseAppName(args, options);

    info("开始构建...");

    // 加载配置
    const { config } = await loadConfig(undefined, appName);

    // 更新构建配置
    if (options.watch === true || options.minify !== undefined) {
      if (!config.build) {
        config.build = { outDir: "dist" };
      }
      if (options.watch === true) {
        (config.build as any).watch = true;
      }
      if (options.minify !== undefined) {
        (config.build as any).minify = options.minify as boolean;
      }
    }

    // 执行构建
    await build(config);

    success("构建完成");
  });

// start 子命令：启动生产服务器
cli.command("start", "启动生产服务器")
  .keepAlive()
  .option(appOption)
  .option({
    name: "port",
    alias: "p",
    description: "端口号",
    requiresValue: true,
  })
  .option({
    name: "host",
    description: "主机地址",
    requiresValue: true,
  })
  .action(async (args, options) => {
    const appName = await parseAppName(args, options);
    displayAppName(appName);

    // 加载配置并更新服务器设置
    const config = await loadConfigWithServerOptions(appName, options);

    // 启动生产服务器
    await startProdServer(config);
  });

/**
 * 解析并预处理命令行参数
 * 支持旧格式 dev:app-name，将其转换为 dev --app app-name
 * @param args 原始命令行参数
 * @returns 处理后的命令行参数
 */
function preprocessArgs(args: string[]): string[] {
  if (args.length === 0) {
    return args;
  }

  const firstArg = args[0];

  // 检查是否包含冒号格式（旧格式：dev:app-name）
  if (firstArg.includes(":") && !firstArg.startsWith("-")) {
    const parts = firstArg.split(":");
    if (parts.length === 2) {
      const [command, appName] = parts;
      // 转换为新格式：command --app app-name
      return [command, "--app", appName, ...args.slice(1)];
    }
  }

  return args;
}

// 预处理参数（支持旧格式 dev:app-name）
const processedArgs = preprocessArgs(Deno.args);

// 执行命令
await cli.execute(processedArgs);

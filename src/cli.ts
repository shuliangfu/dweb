/**
 * CLI 工具入口
 * 使用 Command 类提供 dev、build、start 命令
 */

import { loadConfig } from './core/config.ts';
import { startDevServer } from './features/dev.ts';
import { build } from './features/build.ts';
import { startProdServer } from './features/prod.ts';
import { Command } from './console/command.ts';
import { success, info } from './console/output.ts';
import { interactiveMenu } from './console/prompt.ts';
import { isMultiAppMode } from './core/config.ts';
import { readDenoJson } from './utils/file.ts';

/**
 * 自动获取框架版本号
 * 从框架的 deno.json 文件中读取版本号
 * @returns 版本号字符串
 */
async function getFrameworkVersion(): Promise<string> {
  // 方法1: 从当前文件位置向上查找 deno.json
  try {
    const currentFileUrl = new URL(import.meta.url);
    let currentDir: string;
    
    if (currentFileUrl.protocol === 'file:') {
      // 本地文件系统路径
      let filePath = currentFileUrl.pathname;
      // Windows 路径处理
      if (Deno.build.os === 'windows' && filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      currentDir = filePath.substring(0, filePath.lastIndexOf('/'));
      
      // 尝试从 src/cli.ts 向上查找 deno.json 或 deno.jsonc
      const parentDir = `${currentDir}/..`;
      const denoJson = await readDenoJson(parentDir);
      if (denoJson && denoJson.name === '@dreamer/dweb' && denoJson.version) {
        return denoJson.version;
      }
      
      // 尝试查找 example/deno.json 或 example/deno.jsonc（兼容 example 目录）
      const exampleDir = `${currentDir}/../example`;
      const exampleDenoJson = await readDenoJson(exampleDir);
      if (exampleDenoJson && exampleDenoJson.version) {
        return exampleDenoJson.version;
      }
    }
  } catch {
    // 继续尝试其他方法
  }
  
  // 方法2: 从当前工作目录读取（适用于开发环境）
  try {
    const denoJson = await readDenoJson();
    if (denoJson && denoJson.name === '@dreamer/dweb' && denoJson.version) {
      return denoJson.version;
    }
  } catch {
    // 继续尝试其他方法
  }
  
  // 方法2.1: 尝试从 example/deno.json 或 example/deno.jsonc 读取（兼容 example 目录）
  try {
    const exampleDenoJson = await readDenoJson(`${Deno.cwd()}/example`);
    if (exampleDenoJson && exampleDenoJson.version) {
      return exampleDenoJson.version;
    }
  } catch {
    // 继续尝试其他方法
  }
  
  // 方法2.2: 如果当前在 example 目录，尝试读取当前目录的 deno.json 或 deno.jsonc
  try {
    const cwd = Deno.cwd();
    if (cwd.endsWith('example')) {
      const denoJson = await readDenoJson(cwd);
      if (denoJson && denoJson.version) {
        return denoJson.version;
      }
    }
  } catch {
    // 继续尝试其他方法
  }
  
  // 方法3: 从 JSR URL 中提取版本号（如果是从 JSR 导入）
  try {
    const currentFileUrl = new URL(import.meta.url);
    if (currentFileUrl.protocol === 'https:' || currentFileUrl.protocol === 'http:') {
      // 尝试从 URL 路径中提取版本号
      // JSR 格式：/@dreamer/dweb/1.4.5/src/cli.ts
      const jsrMatch = currentFileUrl.pathname.match(/\/@[\w-]+\/[\w-]+\/([\d.]+)\//);
      if (jsrMatch && jsrMatch[1]) {
        return jsrMatch[1];
      }
    }
  } catch {
    // 忽略错误
  }
  
  // 如果都找不到，返回未知版本
  return "unknown";
}

// 获取框架版本号
const frameworkVersion = await getFrameworkVersion();

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
  options: Record<string, any>
): Promise<string | undefined> {
  // 优先使用 --app 选项
  if (options.app) {
    return options.app as string;
  }
  
  // 检查第一个参数是否包含冒号（兼容旧格式 dev:app-name）
  if (args.length > 0 && args[0].includes(':')) {
    const parts = args[0].split(':');
    if (parts.length === 2) {
      return parts[1];
    }
  }
  
  // 如果没有指定应用名称，检查是否为多应用模式
  // 如果是，则交互式选择应用
  try {
    // 尝试加载配置以检查是否为多应用模式
    // 注意：在多应用模式下，loadConfig 会抛出错误，我们需要捕获并处理
    let config;
    try {
      const result = await loadConfig(undefined, undefined);
      config = result.config;
    } catch (loadError) {
      // 如果是多应用模式但未指定应用的错误，说明确实是多应用模式
      if (loadError instanceof Error && loadError.message.includes("多应用模式下")) {
        // 重新加载配置，但这次我们只读取配置对象，不验证应用名称
        // 我们需要直接读取配置文件来获取应用列表
        const { findConfigFile } = await import('./utils/file.ts');
        const configPath = await findConfigFile();
        if (!configPath) {
          throw new Error("未找到 dweb.config.ts 文件");
        }
        
        // 动态导入配置文件
        const configUrl = new URL(configPath, `file://${Deno.cwd()}/`).href;
        const configModule = await import(configUrl);
        config = configModule.default || configModule;
      } else {
        // 其他错误，重新抛出
        throw loadError;
      }
    }
    
    if (isMultiAppMode(config)) {
      const apps = config.apps || [];
      if (apps.length === 0) {
        throw new Error("多应用模式下未找到任何应用配置");
      }
      
      // 如果只有一个应用，直接返回
      if (apps.length === 1) {
        const appName = apps[0].name;
        if (appName) {
          info(`自动选择应用: ${appName}`);
          return appName;
        }
      }
      
      // 多个应用，让用户选择
      const appNames = apps
        .map((app) => app.name)
        .filter((name): name is string => !!name);
      
      if (appNames.length === 0) {
        throw new Error("多应用模式下未找到有效的应用名称");
      }
      
      // 显示应用列表供用户选择（使用上下键导航）
      const selectedIndex = await interactiveMenu(
        "检测到多应用模式，请选择要操作的应用：",
        appNames
      );
      
      return appNames[selectedIndex];
    }
  } catch (error) {
    // 如果是多应用模式相关的错误，重新抛出
    if (error instanceof Error && error.message.includes("多应用模式")) {
      throw error;
    }
    // 其他错误（如配置文件不存在），返回 undefined，让后续逻辑处理
  }
  
  return undefined;
}

// 创建主命令
const cli = new Command("dweb", "DWeb 框架 CLI 工具")
  .setVersion(frameworkVersion)
  .setUsage("deno run -A src/cli.ts <command> [选项]\n  deno run -A src/cli.ts <command>:<app-name>  # 旧格式（兼容）");

// dev 子命令：启动开发服务器
cli.command("dev", "启动开发服务器")
  .option({
    name: "app",
    alias: "a",
    description: "应用名称（多应用模式）",
    requiresValue: true,
  })
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
    defaultValue: "localhost",
  })
  .option({
    name: "open",
    alias: "o",
    description: "自动打开浏览器",
  })
  .action(async (args, options) => {
    const appName = await parseAppName(args, options);
    
    if (appName) {
      info(`应用: ${appName}`);
    }
    
    // 加载配置（自动查找配置文件，如果指定了应用名称则加载对应应用配置）
    const { config } = await loadConfig(undefined, appName);
    
    // 如果指定了端口，更新配置
    if (options.port) {
      if (!config.server) {
        config.server = {};
      }
      config.server.port = parseInt(options.port as string, 10);
    }
    
    // 如果指定了主机，更新配置
    if (options.host) {
      if (!config.server) {
        config.server = {};
      }
      config.server.host = options.host as string;
    }
    
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
  .option({
    name: "app",
    alias: "a",
    description: "应用名称（多应用模式）",
    requiresValue: true,
  })
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
    
    info('开始构建...');
    
    if (appName) {
      info(`应用: ${appName}`);
    }
    
    // 加载配置（自动查找配置文件，如果指定了应用名称则加载对应应用配置）
    const { config } = await loadConfig(undefined, appName);
    
    // 如果指定了监听模式，更新配置（通过扩展属性）
    if (options.watch === true) {
      if (!config.build) {
        config.build = { outDir: 'dist' };
      }
      (config.build as any).watch = true;
    }
    
    // 如果指定了压缩选项，更新配置（通过扩展属性）
    if (options.minify !== undefined) {
      if (!config.build) {
        config.build = { outDir: 'dist' };
      }
      (config.build as any).minify = options.minify as boolean;
    }
    
    // 执行构建
    await build(config);
    
    success('构建完成');
  });

// start 子命令：启动生产服务器
cli.command("start", "启动生产服务器")
  .option({
    name: "app",
    alias: "a",
    description: "应用名称（多应用模式）",
    requiresValue: true,
  })
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
    defaultValue: "0.0.0.0",
  })
  .action(async (args, options) => {
    const appName = await parseAppName(args, options);
    
    if (appName) {
      info(`应用: ${appName}`);
    }
    
    // 加载配置（自动查找配置文件，如果指定了应用名称则加载对应应用配置）
    const { config } = await loadConfig(undefined, appName);
    
    // 如果指定了端口，更新配置
    if (options.port) {
      if (!config.server) {
        config.server = {};
      }
      config.server.port = parseInt(options.port as string, 10);
    }
    
    // 如果指定了主机，更新配置
    if (options.host) {
      if (!config.server) {
        config.server = {};
      }
      config.server.host = options.host as string;
    }
    
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
  if (firstArg.includes(':') && !firstArg.startsWith('-')) {
    const parts = firstArg.split(':');
    if (parts.length === 2) {
      const [command, appName] = parts;
      // 转换为新格式：command --app app-name
      return [command, '--app', appName, ...args.slice(1)];
    }
  }
  
  return args;
}

// 执行命令
// 如果没有提供命令，显示帮助信息
if (Deno.args.length === 0) {
  cli.showHelp();
  Deno.exit(0);
}

// 预处理参数（支持旧格式 dev:app-name）
const processedArgs = preprocessArgs(Deno.args);

// 执行命令
await cli.execute(processedArgs);

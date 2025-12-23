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
      
      // 尝试从 src/cli.ts 向上查找 deno.json
      const denoJsonPath = `${currentDir}/../deno.json`;
      try {
        const denoJsonContent = await Deno.readTextFile(denoJsonPath);
        const denoJson = JSON.parse(denoJsonContent);
        if (denoJson.name === '@dreamer/dweb' && denoJson.version) {
          return denoJson.version;
        }
      } catch {
        // 继续尝试其他方法
      }
    }
  } catch {
    // 继续尝试其他方法
  }
  
  // 方法2: 从当前工作目录读取（适用于开发环境）
  try {
    const denoJsonPath = `${Deno.cwd()}/deno.json`;
    const denoJsonContent = await Deno.readTextFile(denoJsonPath);
    const denoJson = JSON.parse(denoJsonContent);
    if (denoJson.name === '@dreamer/dweb' && denoJson.version) {
      return denoJson.version;
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
 */
function parseAppName(args: string[], options: Record<string, any>): string | undefined {
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
  
  return undefined;
}

// 创建主命令
const cli = new Command("dweb", "DWeb 框架 CLI 工具")
  .setVersion(frameworkVersion)
  .setUsage("deno run -A src/cli.ts <command> [选项]");

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
    const appName = parseAppName(args, options);
    
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
    const appName = parseAppName(args, options);
    
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
    const appName = parseAppName(args, options);
    
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

// 执行命令
// 如果没有提供命令，显示帮助信息
if (Deno.args.length === 0) {
  cli.showHelp();
  Deno.exit(0);
}

// 执行命令
await cli.execute(Deno.args);

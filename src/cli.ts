/**
 * CLI 工具入口
 * 提供 dev、build、start、create 命令
 */

import { loadConfig } from './core/config.ts';
import { startDevServer } from './features/dev.ts';
import { build } from './features/build.ts';
import { startProdServer } from './features/prod.ts';
import { createApp } from './features/create.ts';

const command = Deno.args[0];

/**
 * 解析命令和应用名称
 * 支持格式：dev、dev:backend、build:frontend 等
 */
function parseCommand(cmd: string): { command: string; appName?: string } {
  const parts = cmd.split(':');
  if (parts.length === 2) {
    return { command: parts[0], appName: parts[1] };
  }
  return { command: cmd };
}

/**
 * 开发服务器命令
 */
async function dev(appName?: string) {
  console.log('🚀 启动开发服务器...');
  if (appName) {
    console.log(`📦 应用: ${appName}`);
  }
  
  // 加载配置（自动查找配置文件，如果指定了应用名称则加载对应应用配置）
  const { config } = await loadConfig(undefined, appName);
  
  // 启动开发服务器
  await startDevServer(config);
}

/**
 * 构建命令
 */
async function buildCommand(appName?: string) {
  console.log('📦 开始构建...');
  if (appName) {
    console.log(`📦 应用: ${appName}`);
  }
  
  // 加载配置（自动查找配置文件，如果指定了应用名称则加载对应应用配置）
	const { config } = await loadConfig(undefined, appName);

  // 执行构建
  await build(config);
  
  console.log('✅ 构建完成');
}

/**
 * 生产服务器命令
 */
async function start(appName?: string) {
  console.log('🚀 启动生产服务器...');
  if (appName) {
    console.log(`📦 应用: ${appName}`);
  }
  
  // 加载配置（自动查找配置文件，如果指定了应用名称则加载对应应用配置）
  const { config } = await loadConfig(undefined, appName);
  
  // 启动生产服务器
  await startProdServer(config);
}

/**
 * 创建新项目命令（交互式）
 */
async function create() {
  // 不再从命令行参数获取项目名称，而是通过交互式提示获取
  try {
    await createApp();
  } catch (error) {
    console.error('❌ 创建项目失败:', error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

// 执行命令
const { command: baseCommand, appName } = parseCommand(command);
switch (baseCommand) {
  case 'dev':
    await dev(appName);
    break;
  case 'build':
    await buildCommand(appName);
    break;
  case 'start':
    await start(appName);
    break;
  case 'create':
    await create();
    break;
  default:
    console.log(`
DWeb 框架 CLI 工具

用法:
  deno run -A src/cli.ts <command>[:app-name]

命令:
  dev[:app-name]     启动开发服务器（单应用模式或指定应用）
  build[:app-name]   构建生产版本（单应用模式或指定应用）
  start[:app-name]   启动生产服务器（单应用模式或指定应用）
  create             创建新项目

示例:
  # 单应用模式
  deno run -A src/cli.ts dev
  deno run -A src/cli.ts build
  deno run -A src/cli.ts start
  
  # 多应用模式（指定应用）
  deno run -A src/cli.ts dev:backend
  deno run -A src/cli.ts build:frontend
  deno run -A src/cli.ts start:backend
  
  # 创建项目
  deno run -A src/cli.ts create
`);
    Deno.exit(1);
}


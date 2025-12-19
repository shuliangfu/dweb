/**
 * CLI 工具入口
 * 提供 dev、build、start、create 命令
 */

import { loadConfig } from './core/config.ts';
import { startDevServer } from './features/dev.ts';
import { build } from './features/build.ts';
import { startProdServer } from './features/prod.ts';
import { createApp } from './features/create.ts';
import { success, error, info, step, help } from './utils/cli-output.ts';

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
  if (appName) {
    step(`应用: ${appName}`);
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
  info('开始构建...');
  if (appName) {
    step(`应用: ${appName}`);
  }
  
  // 加载配置（自动查找配置文件，如果指定了应用名称则加载对应应用配置）
	const { config } = await loadConfig(undefined, appName);

  // 执行构建
  await build(config);
  
  success('构建完成');
}

/**
 * 生产服务器命令
 */
async function start(appName?: string) {
  if (appName) {
    step(`应用: ${appName}`);
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
  } catch (err) {
    error(`创建项目失败: ${err instanceof Error ? err.message : String(err)}`);
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
    help('DWeb 框架 CLI 工具', [
      { command: 'dev[:app-name]', description: '启动开发服务器（单应用模式或指定应用）' },
      { command: 'build[:app-name]', description: '构建生产版本（单应用模式或指定应用）' },
      { command: 'start[:app-name]', description: '启动生产服务器（单应用模式或指定应用）' },
      { command: 'create', description: '创建新项目' },
    ]);
    info('示例:');
    step('单应用模式:');
    console.log('  deno run -A src/cli.ts dev');
    console.log('  deno run -A src/cli.ts build');
    console.log('  deno run -A src/cli.ts start');
    console.log();
    step('多应用模式（指定应用）:');
    console.log('  deno run -A src/cli.ts dev:backend');
    console.log('  deno run -A src/cli.ts build:frontend');
    console.log('  deno run -A src/cli.ts start:backend');
    console.log();
    step('创建项目:');
    console.log('  deno run -A src/cli.ts create');
    console.log();
    Deno.exit(1);
}


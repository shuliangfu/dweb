#!/usr/bin/env -S deno run -Ar
/**
 * DWeb 项目初始化工具
 * 通过直接运行此文件来创建新项目
 *
 * 用法:
 *   deno run -Ar src/init.ts
 *   或
 *   deno run -Ar jsr:@dreamer/dweb/init
 */

import { createApp } from './features/create.ts';

/**
 * 主函数
 * 调用 createApp 函数创建新项目
 */
async function main() {
  try {
    // 从命令行参数获取项目名称（如果提供）
    const projectName = Deno.args[0];
    
    // 调用 createApp 函数创建项目
    await createApp(projectName);
  } catch (error) {
    console.error('❌ 创建项目失败:', error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

// 执行主函数
if (import.meta.main) {
  await main();
}


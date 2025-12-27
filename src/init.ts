#!/usr/bin/env -S deno run -Ar
/**
 * DWeb 项目初始化工具
 * 通过直接运行此文件来创建新项目
 *
 * 用法:
 *   deno run -Ar src/init.ts
 *   或
 *   deno run -Ar jsr:@dreamer/dweb/init
 *
 * 注意：此文件调用 createApp 函数来创建项目，所有项目生成逻辑都在 create.ts 中
 * 包括路径别名配置（@components/、@config/、@store/）等都会自动应用
 */

import { createApp } from "./features/create.ts";

/**
 * 主函数
 * 调用 createApp 函数创建新项目
 *
 * createApp 会自动生成以下内容：
 * - 项目目录结构（routes、components、config、stores 等）
 * - deno.json 配置文件（包含路径别名：@components/、@config/、@store/）
 * - 示例路由、组件和 API（所有路由文件都包含正确的类型导入，如 LoadContext、PageProps 等）
 * - Navbar 导航组件（菜单靠右对齐，支持服务端和客户端路由导航的 active 状态）
 * - 配置文件（dweb.config.ts）
 * - README 和 .gitignore
 */
async function main() {
  try {
    // 从命令行参数获取项目名称（如果提供）
    const projectName = Deno.args[0];

    // 调用 createApp 函数创建项目
    // createApp 会处理所有项目生成逻辑，包括路径别名配置
    await createApp(projectName);
  } catch (error) {
    console.error(
      "❌ 创建项目失败:",
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

// 执行主函数
if (import.meta.main) {
  await main();
}

/**
 * init 生成的 Console 命令路由模板（CLI 文件路由，非 HTTP）
 */

import { $tr } from "../helpers.ts";
import type { ExampleLevel } from "../types.ts";

/** routes/hello.ts —— export world 等方法，供 dweb-cli run hello/world */
export function getConsoleHelloTs(): string {
  return `/**
 * ${$tr("init.template.consoleHelloComment")}
 *
 * 用法:
 *   dweb-cli run hello/world
 */

import type { ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "Hello console commands",
  actions: {
    world: { description: "Print a greeting" },
  },
};

/**
 * 示例命令：打印问候
 */
export function world(_ctx: ConsoleContext): void {
  console.log(${JSON.stringify($tr("init.template.consoleHelloOutput"))});
}
`;
}

/** routes/crond.ts —— start / stop 示例（with-about 粒度） */
export function getConsoleCrondTs(): string {
  return `/**
 * ${$tr("init.template.consoleCrondComment")}
 *
 * 用法:
 *   dweb-cli run crond/start
 *   dweb-cli run crond/stop
 */

import type { ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "Example crond commands",
  actions: {
    start: { description: "Start example job" },
    stop: { description: "Stop example job" },
  },
};

/**
 * 启动示例任务
 */
export function start(_ctx: ConsoleContext): void {
  console.log(${JSON.stringify($tr("init.template.consoleCrondStart"))});
}

/**
 * 停止示例任务
 */
export function stop(_ctx: ConsoleContext): void {
  console.log(${JSON.stringify($tr("init.template.consoleCrondStop"))});
}
`;
}

/** 按示例粒度返回 Console 路由文件列表（相对 routes/） */
export function listConsoleRouteFiles(
  exampleLevel: ExampleLevel,
): Array<{ relativePath: string; content: string }> {
  const files = [
    { relativePath: "hello.ts", content: getConsoleHelloTs() },
  ];
  if (exampleLevel === "with-about") {
    files.push({ relativePath: "crond.ts", content: getConsoleCrondTs() });
  }
  return files;
}

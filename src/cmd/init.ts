#!/usr/bin/env -S deno run -A
/**
 * dweb 项目初始化脚本（脚手架）入口
 *
 * 实际逻辑在 cmd/init/ 目录下；本文件保留以兼容既有导入路径（如 CLI 的 import("./cmd/init.ts")）。
 *
 * 依赖：@dreamer/console、@dreamer/runtime-adapter、dweb 内部 utils/version
 * 运行方式：Deno: deno run -A src/cmd/init.ts [目录名]；Bun: bun run src/cmd/init.ts [目录名]
 */

import {
  type DwebDenoConfig,
  generate,
  type InitMainOptions,
  type InitOptions,
  loadDwebDenoJson,
  main,
} from "./init/mod.ts";

export { generate, loadDwebDenoJson, main };
export type { DwebDenoConfig, InitMainOptions, InitOptions };

#!/usr/bin/env -S deno run -A
// deno run -A build-browser.ts
/**
 * 构建浏览器版客户端 Web3 bundle
 *
 * 将 src/client/web3.ts 及其依赖（含 viem）打包成单文件 ESM，
 * 可通过 <script type="module"> 或 @dreamer/dweb/utils/web3/bundle 引用。
 *
 * 使用：deno run -A build-browser.ts 或 deno task build:web3
 *
 * 输出：
 *   dist/web3-utils.esm.js      - 完整版（含 sourcemap）
 *   dist/web3-utils.esm.min.js  - 压缩版（发布用）
 */

import * as esbuild from "npm:esbuild@0.19.12";
import { dirname, resolve } from "jsr:@std/path@1";

// 获取当前脚本所在目录作为项目根目录
const ROOT = dirname(new URL(import.meta.url).pathname);

// 确保 dist 目录存在
await Deno.mkdir(resolve(ROOT, "dist"), { recursive: true });

console.log("[build-browser] 开始构建客户端 Web3 bundle...");

// 1. 构建完整版（带 sourcemap）
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/client/web3.ts")],
  bundle: true,
  format: "esm",
  outfile: resolve(ROOT, "dist/web3-utils.esm.js"),
  platform: "browser",
  target: ["es2020", "chrome90", "firefox88", "safari14"],
  sourcemap: true,
  minify: false,
  treeShaking: true,
  // 将所有依赖打包进来（包括 viem）
  external: [],
  // 定义环境变量（避免某些库的 Node.js 检测）
  define: {
    "process.env.NODE_ENV": '"production"',
    "global": "globalThis",
  },
  // 日志级别
  logLevel: "info",
});

console.log("[build-browser] ✅ dist/web3-utils.esm.js");

// 2. 构建压缩版
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/client/web3.ts")],
  bundle: true,
  format: "esm",
  outfile: resolve(ROOT, "dist/web3-utils.esm.min.js"),
  platform: "browser",
  target: ["es2020", "chrome90", "firefox88", "safari14"],
  sourcemap: false,
  minify: true,
  treeShaking: true,
  external: [],
  define: {
    "process.env.NODE_ENV": '"production"',
    "global": "globalThis",
  },
  logLevel: "info",
});

console.log("[build-browser] ✅ dist/web3-utils.esm.min.js");

// 3. 生成类型声明（从客户端 web3 源文件重新导出）
const dtsContent = `/**
 * 客户端 Web3 类型声明（bundle 用）
 */
export * from "../src/client/web3.ts";
`;

await Deno.writeTextFile(resolve(ROOT, "dist/web3-utils.esm.d.ts"), dtsContent);
await Deno.writeTextFile(resolve(ROOT, "dist/web3-utils.esm.min.d.ts"), dtsContent);

console.log("[build-browser] ✅ dist/web3-utils.esm.d.ts");
console.log("[build-browser] ✅ dist/web3-utils.esm.min.d.ts");

// 获取文件大小
const stats = await Deno.stat(resolve(ROOT, "dist/web3-utils.esm.min.js"));
const sizeKB = (stats.size / 1024).toFixed(1);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`[build-browser] 压缩后大小: ${sizeKB} KB (${sizeMB} MB)`);
console.log("[build-browser] ✅ 构建完成！");

// 清理
esbuild.stop();

/**
 * 客户端构建时剔除 route 模块中 load 导出的 esbuild 插件
 *
 * 单独文件便于导入与调试，避免 load 及其依赖（如 @dreamer/runtime-adapter、node:*）
 * 被打进浏览器 chunk，解决 hybrid 构建中 node:crypto 等无法解析的问题。
 *
 * 支持的写法：
 * - export function load(...) { } / export async function load(...) { }
 * - export function load<T>(...) { }（泛型）
 * - export const load = () => { } / export const load = async () => { }
 * - export const load = function (...) { } / export const load = async function (...) { }
 *
 * 不支持（分开写的不剔除）：function load(...) {}; export { load }; 或 const load = ...; export { load };
 */

import type { BuildPlugin } from "@dreamer/esbuild";
import { readTextFile } from "../core/runtime-adapter.ts";

/**
 * 从路由模块源码中移除 load 的导出
 */
export function stripLoadExport(source: string): string {
  let s = source;
  s = stripExportFunctionLoad(s);
  s = stripExportConstLoad(s);
  return s;
}

/** 移除 export [async] function load [<T>] (...) { ... } 整段 */
function stripExportFunctionLoad(source: string): string {
  const re = /\bexport\s+(async\s+)?function\s+load\s*(<[^>]*>)?\s*\(/;
  const match = source.match(re);
  if (!match) return source;
  const startIndex = source.indexOf(match[0]);
  if (startIndex === -1) return source;
  let i = startIndex + match[0].length;
  const len = source.length;
  // 先跳过参数列表 (...) ，避免把类型里的 { } 当成函数体
  let parenDepth = 1;
  while (i < len && parenDepth !== 0) {
    const c = source[i];
    if (c === "(") parenDepth++;
    else if (c === ")") parenDepth--;
    i++;
  }
  // 再跳过可选的返回类型等，找到函数体开头的 {
  while (i < len && source[i] !== "{") i++;
  if (i >= len || source[i] !== "{") return source;
  i++;
  // 对函数体内的所有 { } 计数，找到匹配的 }
  let depth = 1;
  while (i < len && depth !== 0) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  const endIndex = i <= len ? i : len;
  const before = source.slice(0, startIndex).replace(/\n\s*$/, "");
  const after = source.slice(endIndex).replace(/^\s*\n/, "");
  return before + (before.endsWith("\n") ? "" : "\n") + after;
}

/**
 * 移除 export const load = ... 整句（箭头或 function 表达式，含 => { } 与 => expr）。
 * 使用括号/大括号计数确定边界，=> 后的表达式体以 depth===0 时的 ; 或换行结束。
 */
function stripExportConstLoad(source: string): string {
  const prefix = "export const load = ";
  const idx = source.indexOf(prefix);
  if (idx === -1) return source;
  const startIndex = idx;
  let i = idx + prefix.length;
  const len = source.length;
  while (i < len && /[\s\n]/.test(source[i])) i++;
  if (i >= len) return source;
  // async function ( ... ) { ... } 或 function ( ... ) { ... }
  if (source.slice(i).startsWith("async ")) {
    i += 6;
    while (i < len && /[\s\n]/.test(source[i])) i++;
  }
  if (source.slice(i).startsWith("function ")) {
    i += 9;
    const parenStart = source.indexOf("(", i);
    if (parenStart === -1) return source;
    i = parenStart + 1;
    let depth = 1;
    while (i < len && depth !== 0) {
      const c = source[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      i++;
    }
    while (i < len && /[\s\n]/.test(source[i])) i++;
    if (source[i] !== "{") return source;
    i++;
    depth = 1;
    while (i < len && depth !== 0) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    const endIndex = i;
    const before = source.slice(0, startIndex).replace(/\n\s*$/, "");
    const after = source.slice(endIndex).replace(/^\s*\n/, "");
    return before + (before.endsWith("\n") ? "" : "\n") + after;
  }
  // ( ... ) => { ... } 或 ( ... ) => expr
  if (source[i] !== "(") return source;
  i++;
  let parenDepth = 1;
  while (i < len && parenDepth !== 0) {
    const c = source[i];
    if (c === "(") parenDepth++;
    else if (c === ")") parenDepth--;
    i++;
  }
  while (i < len && /[\s\n]/.test(source[i])) i++;
  if (source.slice(i, i + 2) !== "=>") return source;
  i += 2;
  while (i < len && /[\s\n]/.test(source[i])) i++;
  if (i >= len) return source;
  if (source[i] === "{") {
    i++;
    let depth = 1;
    while (i < len && depth !== 0) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
  } else {
    let depth = 0;
    while (i < len) {
      const c = source[i];
      if (c === ";" && depth === 0) {
        i++;
        break;
      }
      if (c === "\n" && depth === 0) break;
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      i++;
    }
  }
  const endIndex = i;
  const before = source.slice(0, startIndex).replace(/\n\s*$/, "");
  const after = source.slice(endIndex).replace(/^\s*\n/, "");
  return before + (before.endsWith("\n") ? "" : "\n") + after;
}

/**
 * 创建「客户端构建时剔除 route 模块中 load 导出」的 esbuild 插件。
 * 仅对路径在 routesDir 下的 .ts/.tsx/.js/.jsx 生效，避免 load 及其依赖被打进浏览器 chunk。
 */
export function createStripLoadPlugin(routesDirAbs: string): BuildPlugin {
  const normalizedRoutes = routesDirAbs.replace(/\\/g, "/");
  return {
    name: "dweb-strip-load",
    setup(build) {
      build.onLoad(
        { filter: /\.(tsx?|jsx?)$/ },
        async (args) => {
          const pathNorm = args.path.replace(/\\/g, "/");
          if (!pathNorm.includes(normalizedRoutes)) return null;
          try {
            const raw = await readTextFile(args.path);
            const stripped = stripLoadExport(raw);
            if (stripped === raw) return null;
            const ext = args.path.replace(/^.*\./, "");
            const loader = ext === "tsx" || ext === "jsx" ? "tsx" : "ts";
            return { contents: stripped, loader };
          } catch {
            return null;
          }
        },
      );
    },
  };
}

/**
 * View `render.compiler`（{@link RenderCompilerOptions}）解析：输出绝对路径（正斜杠）。
 *
 * @module dweb/utils/view-compiler
 */

import { cwd, resolve } from "../core/runtime-adapter.ts";
import type { RenderCompilerOptions } from "../types/app.ts";

/**
 * 将路径列表规范化为绝对路径（正斜杠）；空或无效则 `undefined`。
 *
 * @param dirs - 配置中的目录列表
 * @param cwdPath - 相对路径的解析基准，默认 `cwd()`
 * @returns 非空时返回规范化后的根列表
 */
function normalizeDirsArray(
  dirs: string[] | undefined,
  cwdPath: string,
): string[] | undefined {
  if (dirs == null || dirs.length === 0) return undefined;
  const out = dirs.map((r) => resolve(cwdPath, r).replace(/\\/g, "/"));
  return out.length > 0 ? out : undefined;
}

/**
 * 从 `render.compiler` 配置中提取 `dirs` 字段。
 *
 * @param compiler - 应用配置中的 `render.compiler`
 */
function compilerDirsFromConfig(
  compiler: RenderCompilerOptions | undefined,
): string[] | undefined {
  return compiler?.dirs;
}

/**
 * 客户端 bundle 是否应对 `compiler` 启用 jsx-compiler（`client !== false`）。
 */
function isCompilerEnabledForClient(
  compiler: RenderCompilerOptions | undefined,
): boolean {
  if (compiler == null) return false;
  return compiler.client !== false;
}

/**
 * 服务端（SSR bundle、`loadRouteModule`）是否应对 `compiler` 启用编译器（`server !== false`）。
 */
function isCompilerEnabledForServer(
  compiler: RenderCompilerOptions | undefined,
): boolean {
  if (compiler == null) return false;
  return compiler.server !== false;
}

/**
 * 解析 **客户端** 使用的编译器根列表：当 `client === false`（对象形态）时返回 `undefined`，
 * 否则将 `dirs` 规范化为绝对路径。
 *
 * @param compiler - `AppConfig.render.compiler`
 * @param cwdPath - 相对路径基准，默认 `cwd()`
 */
export function resolveRenderCompilerForClient(
  compiler: RenderCompilerOptions | undefined,
  cwdPath: string = cwd(),
): string[] | undefined {
  if (!isCompilerEnabledForClient(compiler)) return undefined;
  return normalizeDirsArray(compilerDirsFromConfig(compiler), cwdPath);
}

/**
 * 解析 **服务端** 使用的编译器根列表：当 `server === false`（对象形态）时返回 `undefined`，
 * 否则将 `dirs` 规范化为绝对路径。
 *
 * @param compiler - `AppConfig.render.compiler`
 * @param cwdPath - 相对路径基准，默认 `cwd()`
 */
export function resolveRenderCompilerForServer(
  compiler: RenderCompilerOptions | undefined,
  cwdPath: string = cwd(),
): string[] | undefined {
  if (!isCompilerEnabledForServer(compiler)) return undefined;
  return normalizeDirsArray(compilerDirsFromConfig(compiler), cwdPath);
}

/**
 * 仅提取并规范化 `dirs`，**不**应用 `client` / `server` 开关。
 *
 * 适用于仅需「白名单根目录」列表的工具场景；运行时应优先使用
 * {@link resolveRenderCompilerForClient} / {@link resolveRenderCompilerForServer}。
 *
 * @param compiler - `AppConfig.render.compiler`
 * @param cwdPath - 相对路径基准，默认 `cwd()`
 */
export function normalizeRenderCompiler(
  compiler: RenderCompilerOptions | undefined,
  cwdPath: string = cwd(),
): string[] | undefined {
  return normalizeDirsArray(compilerDirsFromConfig(compiler), cwdPath);
}

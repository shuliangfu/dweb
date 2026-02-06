/**
 * 路径工具函数
 *
 * 职责：
 * - 路径安全校验（是否在项目目录内）
 * - 路径规范化与比较
 * - 日志友好路径格式化
 */

import { cwd, relative, resolve } from "../core/runtime-adapter.ts";

/**
 * 规范化路径用于字符串比较
 * 统一斜杠、解析绝对路径，便于跨平台比较
 *
 * @param p 路径
 * @returns 规范化后的路径字符串
 */
function normalizePathForCompare(p: string): string {
  const s = resolve(p).replace(/\\/g, "/");
  return s.replace(/\/\.\//g, "/").replace(/\/+$/g, "");
}

/**
 * 校验路径是否在项目目录内，防止加载项目外任意文件
 *
 * 用于：中间件/插件加载、路由模块加载、配置热重载等场景。
 *
 * @param resolvedPath 已解析的绝对路径
 * @param projectRoot 项目根目录（默认 cwd）
 * @returns 是否在项目内
 */
export function isPathWithinProject(
  resolvedPath: string,
  projectRoot: string = cwd(),
): boolean {
  const a = normalizePathForCompare(resolvedPath);
  const b = normalizePathForCompare(projectRoot);
  return a === b || a.startsWith(b + "/");
}

/**
 * 将路径转为日志友好格式：在项目内则返回相对路径，否则返回原路径
 *
 * 用于 DEBUG 日志，避免输出过长绝对路径。
 *
 * @param absOrRelPath 绝对或相对路径
 * @param projectRoot 项目根目录（默认 cwd）
 * @returns 相对路径（若在项目内）或原路径
 */
export function pathForLog(
  absOrRelPath: string,
  projectRoot: string = cwd(),
): string {
  const resolved = normalizePathForCompare(absOrRelPath);
  const rootNorm = normalizePathForCompare(projectRoot);
  if (resolved === rootNorm || resolved.startsWith(rootNorm + "/")) {
    return relative(projectRoot, resolved) || ".";
  }
  return absOrRelPath;
}

/**
 * 规范化路径用于字符串比较（导出供需要额外逻辑的模块使用）
 *
 * 统一斜杠并折叠 /./ 与 /../，便于路径比较。
 *
 * @param p 路径
 * @returns 规范化后的路径字符串
 */
export { normalizePathForCompare };

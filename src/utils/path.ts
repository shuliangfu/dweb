/**
 * 路径工具函数
 *
 * 职责：
 * - 路径安全校验（是否在项目目录内）
 * - 路径规范化与比较
 * - 日志友好路径格式化
 */

import { platform, realPathSync } from "@dreamer/runtime-adapter";
import { cwd, relative, resolve } from "../core/runtime-adapter.ts";

/**
 * 去掉 Windows 上 `fs.realPath` 等可能返回的逐字（verbatim）路径前缀
 * `\\?\\` / `\\?\\UNC\\` / `//?/C:/` 等，使与 `process.cwd()` 常见的 `C:\\...` 在
 * 同一套归一规则下可安全比较。否则 `isPathWithinProject` 会误判、动态 import 不加载。
 *
 * @param absolute 已 `resolve` 的绝对路径
 * @returns 可参与斜杠归一、与项目根比对的等效路径
 * @see https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#maximum-path-length-limitation
 */
function stripWindowsVerbatimForCompare(absolute: string): string {
  if (platform() !== "windows") {
    return absolute;
  }
  if (absolute.startsWith("\\\\?\\UNC\\")) {
    // \\?\UNC\server\share\path -> \\server\share\path
    return "\\\\" + absolute.slice(8);
  }
  if (absolute.startsWith("\\\\?\\")) {
    // \\?\C:\path -> C:\path
    return absolute.slice(4);
  }
  const s = absolute.replace(/\\/g, "/");
  if (s.length >= 8 && s.toLowerCase().startsWith("//?/unc/")) {
    // //?/unc/server/share -> //server/share
    return "//" + s.slice(8);
  }
  if (s.startsWith("//?/") && s.length > 4) {
    // //?/C:/Users/... -> C:/Users/...
    return s.slice(4);
  }
  return absolute;
}

/**
 * 规范化路径用于字符串比较
 * 统一斜杠、解析绝对路径，便于跨平台比较
 *
 * @param p 路径
 * @returns 规范化后的路径字符串
 */
export function normalizePathForCompare(p: string): string {
  const resolved = resolve(p);
  const unverbatim = stripWindowsVerbatimForCompare(resolved);
  const s = unverbatim.replace(/\\/g, "/");
  return s.replace(/\/\.\//g, "/").replace(/\/+$/g, "");
}

/**
 * Windows 上同一路径可能同时存在 **8.3 短名**（如 `RUNNER~1`）与**长名**
 * （如 `Users\runner\`）两种表示；`cwd()` 与 `fs.realpath` 返回的哪一种
 * 不一致时，仅靠斜杠/逐字归一后仍无法用 `startsWith` 比较。
 * 本函数在参与 `isPathWithinProject` 前用 **`realPathSync` 收束为同一形式**（失败则回退
 * 为 `resolve` 结果，避免路径尚不存在时抛错阻断调用方）。
 */
function toComparableRealPath(absolute: string): string {
  if (platform() !== "windows") {
    return absolute;
  }
  const resolved = resolve(absolute);
  try {
    return realPathSync(resolved);
  } catch {
    return resolved;
  }
}

/**
 * 校验路径是否在项目目录内，防止加载项目外任意文件
 *
 * 用于：中间件/插件加载、路由模块加载、配置热重载等场景。
 * Windows 下使用大小写不敏感比较，避免驱动号等差异导致误判；并对 **8.3 / 长路径**
 * 与 **`\\?\` 逐字** 等形态做与 `cwd` 可比的归一（见上）。
 *
 * @param resolvedPath 已解析的绝对路径
 * @param projectRoot 项目根目录（默认 cwd）
 * @returns 是否在项目内
 */
export function isPathWithinProject(
  resolvedPath: string,
  projectRoot: string = cwd(),
): boolean {
  const a = normalizePathForCompare(
    toComparableRealPath(resolvedPath),
  );
  const b = normalizePathForCompare(
    toComparableRealPath(projectRoot),
  );
  const isWin = platform() === "windows";
  const cmp = (x: string, y: string) =>
    isWin ? x.toLowerCase() === y.toLowerCase() : x === y;
  const startsWith = (x: string, y: string) =>
    isWin ? x.toLowerCase().startsWith(y.toLowerCase()) : x.startsWith(y);
  return cmp(a, b) || startsWith(a, b + "/");
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
 * 从任意路径提取与 ROUTE_LOADERS key 一致的 component 路径（Windows 兼容）
 *
 * CSR/Hybrid 模式下，客户端 loadPageModule 需匹配 ROUTE_LOADERS 的 key（如 "index"、"user/[id]"）。
 * 服务端 hydrationData.component 与 clientRoutes[].component 可能来自 router，格式可能为：
 * - 相对路径：route.file 如 "user/[id].tsx"（相对于 routesDir）
 * - 绝对路径：如 C:/project/src/routes/index、/project/src/routes/user/[id].tsx
 * 本函数统一提取 routes 相对路径，确保与 scanRouteComponents 生成的 key 一致。
 *
 * @param routesDirPath routes 目录的绝对路径（如 C:/project/src/routes 或 /project/src/routes）
 * @param rawPath 原始路径（如 match.route.file、C:/project/src/routes/index、src\routes\user\[id].tsx）
 * @returns 提取的 component 路径（如 "index"、"user/[id]"），无法提取时返回规范化后的 rawPath
 */
export function extractComponentPathFromRouteFile(
  routesDirPath: string,
  rawPath: string,
): string {
  if (!rawPath || typeof rawPath !== "string") return "";
  const trimmed = rawPath.trim();
  if (!trimmed) return "";
  const noExt = trimmed.replace(/\.(tsx?|jsx?)$/, "").trim();
  const normalizedNoExt = noExt.replace(/\\/g, "/").replace(/^\.\//, "");

  // 若 rawPath 已是 routes 相对路径（如 "user/[id].tsx"、"index"），直接返回
  // 注意：resolve("user/[id]") 会基于 cwd 解析为 .../basic/user/[id]，导致错误
  const isAbsolute = /^\/|^[A-Za-z]:[\\/]/i.test(trimmed);
  if (!isAbsolute && normalizedNoExt) {
    return normalizedNoExt;
  }

  // 绝对路径：从 routesDirPath 后截取
  const normalizedRoutes = normalizePathForCompare(routesDirPath);
  const normalizedRaw = normalizePathForCompare(rawPath)
    .replace(/\.(tsx?|jsx?)$/, "")
    .trim();
  if (normalizedRaw.includes(normalizedRoutes)) {
    const relative = normalizedRaw
      .slice(
        normalizedRaw.indexOf(normalizedRoutes) + normalizedRoutes.length,
      )
      .replace(/^\//, "");
    if (relative) return relative;
  }

  return normalizedRaw.replace(/\\/g, "/").trim();
}

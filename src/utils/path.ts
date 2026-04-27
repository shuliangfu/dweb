/**
 * 路径工具函数
 *
 * 职责：
 * - 路径安全校验（是否在项目目录内）
 * - 路径规范化与比较
 * - 日志友好路径格式化
 */

import {
  isDirectorySync,
  platform,
  realPathSync,
} from "@dreamer/runtime-adapter";
import {
  basename,
  cwd,
  dirname,
  join,
  relative,
  resolve,
} from "../core/runtime-adapter.ts";

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
 * 仅做逐字/斜杠/尾斜杠/`.` 段 归一，**不**调用 `resolve`。
 * 在 Windows 上，若 `join` 或 runtime 对文件路径返回 `//?/D:/...`，而
 * `routesDir` 仍为 `D:/...`，则在「不 resolve」的前缀剥除阶段两端必须同时剥
 * `//?/`，否则整串在位置 0 上永远对不齐。
 *
 * @param p 任意表示绝对路径的字符串
 * @returns 可安全做子路径前缀比对的字符串
 */
export function normalizePathStringForSubpathExtraction(p: string): string {
  const s0 = p.replace(/\\/g, "/");
  const u = stripWindowsVerbatimForCompare(s0);
  return u.replace(/\\/g, "/").replace(/\/\.\//g, "/").replace(/\/+$/g, "");
}

/**
 * 将 `config.router.routesDir` 规范为**绝对**路径，兼容「仓库 / 多包根为 cwd」与
 * 「应用子目录为 cwd」两种启动方式对同一条配置的差异。
 *
 * 典型问题：多包示例中配置为 `./frontend/routes`；从 monorepo 子目录
 * `.../my-app/frontend` 启动时若直接 `join(cwd, "frontend/routes")` 会得到
 * `.../my-app/frontend/frontend/routes`（首段与 cwd 末级重复，ENOENT）。
 * 当**主解析路径**不是已存在目录时，再尝试**去掉最前一段**后解析
 * （`frontend/routes` → 与 `cwd` 同级的 `routes`）。
 *
 * 若主路径、备选路径均不是目录，返回主路径（与仅 `join`+`resolve` 的旧行为一致，便于由上层报清晰错误）。
 *
 * @param cwdPath 当前工作目录
 * @param routesDirRaw 配置中的 `router.routesDir`（可含 `./` 前缀，缺省同 `./src/routes`）
 * @returns 已 `resolve` 的绝对路径
 */
export function resolveRouterRoutesDirPath(
  cwdPath: string,
  routesDirRaw?: string,
): string {
  const defaultRel = "./src/routes";
  const raw = routesDirRaw != null && String(routesDirRaw).trim() !== ""
    ? String(routesDirRaw).trim()
    : defaultRel;
  const trimmed = raw.replace(/^\.\/?/, "") || raw;
  /**
   * 调用方已传绝对路径（如测试里 `join(testDir, "routes")`）时仅 `resolve` 收束，
   * 不要与 `cwd` 再 `join`；否则部分运行时下 `join` 对绝对第二参的行为与「去首段」补救
   * 会破坏路径。
   */
  if (trimmed.startsWith("/") || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    return resolve(trimmed);
  }
  const normalized = trimmed;
  const primary = resolve(join(cwdPath, normalized));
  if (isDirectorySync(primary)) {
    return primary;
  }
  const segs = normalized.split(/[/\\]+/).filter(Boolean);
  if (segs.length >= 2) {
    const alt = resolve(join(cwdPath, segs.slice(1).join("/")));
    if (isDirectorySync(alt)) {
      return alt;
    }
  }
  return primary;
}

/**
 * Windows 上同一路径可能同时存在 **8.3 短名**（如 `RUNNER~1`）与**长名**
 * （如 `Users\runner\`）两种表示；`cwd()` 与 `fs.realpath` 返回的哪一种
 * 不一致时，仅靠斜杠/逐字归一后仍无法用 `startsWith` 比较。
 * 本函数在参与 `isPathWithinProject` 前用 **`realPathSync` 收束为同一形式**。
 * 若**末级或中间目录尚不存在**则 `realPathSync` 会失败：此时**向上**找到已存在
 * 的目录做 `realPathSync` 再逐段 `join`，与项目根上 `realPathSync` 的 8.3/长名
 * 表示一致，避免对「仅 resolve 的绝对路径」与根混用导致 `path.relative` 出现无意义
 * 的 `..` 而误判为项目外（GHA + Bun 上 `isPathWithinProject` / `pathForLog` 失败）。
 */
function toComparableRealPath(absolute: string): string {
  if (platform() !== "windows") {
    return absolute;
  }
  return realPathWithMissingSegments(absolute);
}

/**
 * Windows：对已 `resolve` 的路径尽量得到与 `fs.realPath` 一致的表示；遇 ENOENT
 * 则自底向上剥离末段，直到 `realPathSync` 成功，再按序 `join` 回未解析的各段。
 *
 * @param absolute 已 `resolve` 的绝对路径
 */
function realPathWithMissingSegments(absolute: string): string {
  const resolved = resolve(absolute);
  try {
    return realPathSync(resolved);
  } catch {
    // 典型原因：子路径或中间目录尚未存在，无法一次 realPath 整条路径
  }
  const tail: string[] = [];
  let current = resolved;
  for (let i = 0; i < 1024; i++) {
    try {
      const real = realPathSync(current);
      let out = real;
      for (const seg of tail) {
        out = join(out, seg);
      }
      return out;
    } catch {
      const parent = dirname(current);
      const base = basename(current);
      if (parent === current || !base) {
        return resolved;
      }
      tail.unshift(base);
      current = parent;
    }
  }
  return resolved;
}

/**
 * Windows 上在 `toComparableRealPath` 后仍用字符串 **startsWith** 时，8.3 与长名
 * 混用（`RUNNER~1` vs 完整用户名段）会失败。对同一盘符的绝对路径，用
 * `relative(root, child)` 判断「是否在根下」比前缀更稳；并排除跨盘符
 * （runtime-adapter 在异盘时 `relative` 会返回目标绝对路径，按「非子路径」处理）。
 */
function isPathUnderRootOnWindows(
  childAbs: string,
  rootAbs: string,
): boolean {
  const a = childAbs.replace(/\\/g, "/");
  const b = rootAbs.replace(/\\/g, "/");
  const dA = a.match(/^([A-Za-z]):\//i)?.[1];
  const dB = b.match(/^([A-Za-z]):\//i)?.[1];
  if (dA && dB && dA.toLowerCase() !== dB.toLowerCase()) {
    return false;
  }
  const rel = relative(rootAbs, childAbs);
  if (rel === "" || rel === ".") {
    return true;
  }
  if (/^([A-Za-z]):\//.test(rel) && (rel.length > 3 || /[/\\]/.test(rel))) {
    const cNorm = a.toLowerCase();
    const rNorm = b.toLowerCase();
    if (cNorm === rNorm) {
      return true;
    }
    return cNorm.startsWith(rNorm.endsWith("/") ? rNorm : rNorm + "/");
  }
  const withSlash = rel.replace(/\\/g, "/");
  if (withSlash.split("/").some((p) => p === "..") || withSlash === "..") {
    return false;
  }
  if (/^\.\.($|\/)/.test(withSlash)) {
    return false;
  }
  return true;
}

/**
 * 校验路径是否在项目目录内，防止加载项目外任意文件
 *
 * 用于：中间件/插件加载、路由模块加载、配置热重载等场景。
 * **Windows** 在逐字/斜杠/ **realPathSync** 后，优先用
 * `isPathUnderRootOnWindows` 做 **relative 判定**；**非 Windows** 用字符串
 * 相等 + 带 `/` 前缀。
 *
 * @param resolvedPath 已解析的绝对路径
 * @param projectRoot 项目根目录（默认 cwd）
 * @returns 是否在项目内
 */
export function isPathWithinProject(
  resolvedPath: string,
  projectRoot: string = cwd(),
): boolean {
  const isWin = platform() === "windows";
  if (isWin) {
    const child = toComparableRealPath(resolvedPath);
    const root = toComparableRealPath(projectRoot);
    return isPathUnderRootOnWindows(child, root);
  }
  const a = normalizePathForCompare(resolvedPath);
  const b = normalizePathForCompare(projectRoot);
  return a === b || a.startsWith(b + "/");
}

/**
 * 将路径转为日志友好格式：在项目内则返回相对路径，否则返回原路径
 *
 * 用于 DEBUG 日志，避免输出过长绝对路径。
 * **Windows** 在通过 **`isPathWithinProject`** 后，用与之一致的
 * **`toComparableRealPath` + `relative`** 生成相对式，与 8.3/长名一致。
 *
 * @param absOrRelPath 绝对或相对路径
 * @param projectRoot 项目根目录（默认 cwd）
 * @returns 相对路径（若在项目内）或原路径
 */
export function pathForLog(
  absOrRelPath: string,
  projectRoot: string = cwd(),
): string {
  if (!isPathWithinProject(absOrRelPath, projectRoot)) {
    return absOrRelPath;
  }
  if (platform() === "windows") {
    const relp = relative(
      toComparableRealPath(projectRoot),
      toComparableRealPath(absOrRelPath),
    );
    return relp === "" || relp === "." ? "." : relp.replace(/\\/g, "/");
  }
  const resolved = normalizePathForCompare(absOrRelPath);
  return relative(projectRoot, resolved) || ".";
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

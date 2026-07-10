/**
 * CSR 客户端 chunk 索引与匹配（纯函数）
 *
 * 从 `csr-client-builder` 拆出，供 HMR / 中间件 / 构建共用。
 * **不改变** chunk URL 约定与匹配语义。
 *
 * @module
 */

import { basename } from "../core/runtime-adapter.ts";
import { CLIENT_OUTPUT_MAIN_FILENAME } from "../utils/constants.ts";

/**
 * 为开发态 HMR 构建「路由 component 标识 → 当前产物 chunk 的 URL」映射。
 * 改 `src/components` 等共享模块时无单一 `chunkUrl`，客户端用 `match.route.component` 查表即可只刷新当前路由。
 *
 * @param routeComponents `scanRouteComponents` 结果
 * @param outputFileNames 本次构建内存产物中的文件名列表（含 basename 与相对路径键）
 */
export function buildRouteChunkUrlMap(
  routeComponents: readonly { componentPath: string }[],
  outputFileNames: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of routeComponents) {
    const chunkFileName = getChunkFileNameForComponent(
      c.componentPath,
      outputFileNames,
    );
    if (chunkFileName) map[c.componentPath] = `/${chunkFileName}`;
  }
  return map;
}

/**
 * 根据 componentPath 从输出文件名列表中匹配对应 chunk。
 * esbuild 命名规则：about.tsx -> about-XXX.js；多段如 admin/index 可能为 admin-index-XXX.js 或 admin/index-XXX.js；
 * 根 index 可能为 routes-XXX.js。优先按完整路径匹配，避免 admin/index 误匹配到根 index 的 chunk。
 */
export function getChunkFileNameForComponent(
  componentPath: string,
  outputFileNames: string[],
): string | null {
  const segment = componentPath.split("/").pop() || componentPath;
  let jsOnly = outputFileNames.filter((n) =>
    n.endsWith(".js") && n !== CLIENT_OUTPUT_MAIN_FILENAME
  );

  // 多段路径（如 desktop/basic/button、desktop/index）：优先匹配含完整路径的 chunk，避免与首段同名 chunk 混淆
  if (componentPath.includes("/")) {
    const segments = componentPath.split("/");
    const firstSegment = segments[0];
    const pathAsDash = componentPath.replace(/\//g, "-");
    const pathAsUnderscore = componentPath.replace(/\//g, "_");
    const pathAsSlash = componentPath;
    const pathVariants = [pathAsDash, pathAsUnderscore, pathAsSlash];
    // 优先尝试 key 中含完整路径的 chunk（如 desktop-basic-button-XXX.js），再考虑首段
    jsOnly = [...jsOnly].sort((a, b) => {
      const aHasFull = pathVariants.some((pv) => a.includes(pv)) ? 0 : 1;
      const bHasFull = pathVariants.some((pv) => b.includes(pv)) ? 0 : 1;
      if (aHasFull !== bHasFull) return aHasFull - bHasFull;
      const aHasPath = firstSegment && a.includes(firstSegment) ? 0 : 1;
      const bHasPath = firstSegment && b.includes(firstSegment) ? 0 : 1;
      return aHasPath - bHasPath;
    });
    for (const name of jsOnly) {
      const base = name.slice(0, -3).replace(/\.js$/, "");
      const baseNoHash = base.replace(/-[A-Za-z0-9]{6,10}$/, "");
      const baseLastPart = base.includes("/") ? base.split("/").pop()! : base;
      const baseLastNoHash = baseLastPart.replace(/-[A-Za-z0-9]{6,10}$/, "");
      const baseEndsWithPath = baseNoHash === pathAsSlash ||
        baseNoHash.endsWith("/" + pathAsSlash) ||
        baseNoHash.endsWith(pathAsSlash) ||
        baseNoHash.endsWith("/" + pathAsDash) ||
        baseNoHash.endsWith(pathAsDash) ||
        baseNoHash.endsWith(pathAsUnderscore);
      for (const pv of pathVariants) {
        if (
          baseNoHash === pv ||
          baseLastNoHash === pv ||
          baseEndsWithPath ||
          base.startsWith(pv + "-") ||
          baseLastPart.startsWith(pv + "-")
        ) {
          return name;
        }
      }
      if (pathVariants.some((pv) => base === pv || baseLastPart === pv)) {
        return name;
      }
      // 仅两段路径（如 desktop/index）且 chunk 为首段名时，允许匹配，避免 desktop/index 误用 desktop-basic-button
      if (
        segments.length === 2 &&
        (baseNoHash === firstSegment || base.startsWith(firstSegment + "-"))
      ) {
        return name;
      }
    }
    /**
     * esbuild 对深层路由有时只产出「末段」文件名（如 workspace/projects/create.tsx → create-XXX.js），
     * 上文按完整 pathVariants 匹配会失败，导致 routeChunkUrls 缺项、HMR 退回裸 import() 被浏览器缓存。
     * 若按末段匹配的候选 chunk 唯一，则采纳该文件。
     */
    const lastSeg = segments[segments.length - 1] || "";
    if (lastSeg) {
      const lastSegCandidates = jsOnly.filter((name) => {
        const base = name.slice(0, -3).replace(/\.js$/, "");
        const baseNoHash = base.replace(/-[A-Za-z0-9]{6,10}$/, "");
        const baseLastPart = base.includes("/") ? base.split("/").pop()! : base;
        const baseLastNoHash = baseLastPart.replace(/-[A-Za-z0-9]{6,10}$/, "");
        return (
          baseNoHash === lastSeg ||
          baseLastNoHash === lastSeg ||
          base.startsWith(lastSeg + "-") ||
          baseLastPart.startsWith(lastSeg + "-")
        );
      });
      if (lastSegCandidates.length === 1) return lastSegCandidates[0];
    }
    return null;
  }

  for (const name of jsOnly) {
    const base = name.slice(0, -3);
    if (base.startsWith(segment + "-") || base === segment) {
      return name;
    }
  }
  // 根 index 路由：esbuild 可能把 routes/index.tsx 打成 routes-XXX.js；仅当 componentPath 为单段 "index" 时匹配
  if (segment === "index" && !componentPath.includes("/")) {
    const routesChunk = jsOnly.find((n) => {
      const base = n.slice(0, -3);
      return base.startsWith("routes-");
    });
    if (routesChunk) return routesChunk;
  }
  return null;
}

/**
 * 检查路径是否是客户端 chunk 文件
 *
 * esbuild 生成的 chunk 文件格式：
 * - chunk-XXXXXXXX.js（共享代码块）
 * - about-XXXXXXXX.js（按路由分割的页面）
 * - _layout-XXXXXXXX.js（布局组件）
 * - routes/index-XXXXXXXX.js（多段路径，Windows/Unix 兼容）
 *
 * @param pathname URL 路径
 * @returns 是否是 chunk 文件
 */
export function isClientChunkFile(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  // 支持 .js 与 .js.map（source map）
  const isJs = pathname.endsWith(".js");
  const isMap = pathname.endsWith(".js.map");
  if (!isJs && !isMap) return false;

  // 排除主入口
  if (pathname === "/_client.js" || pathname === "/_client.js.map") {
    return false;
  }

  // 匹配 esbuild chunk：
  // - 带 hash：/name-hash.js 或 /path/name-hash.js（hash 6–10 位，含小写，与 getChunkBaseName 一致）
  // - 无 hash：/name.js 或 /path/name.js（开发模式 chunkNames: "[name]" 时）
  // 多段路径兼容：esbuild 对 import("./routes/index.tsx") 可能生成 routes/index-XXX.js
  const chunkWithHash = /^\/[\w\[\]_\-\/]+-[a-zA-Z0-9]{6,10}\.(?:js|js\.map)$/;
  const chunkNoHash = /^\/[\w\[\]_\-\/]+\.(?:js|js\.map)$/;
  return chunkWithHash.test(pathname) || chunkNoHash.test(pathname);
}

/**
 * 从 fileName 提取 chunk 基础名（用于 HMR 回退匹配）
 * 例如：index-ABC123.js -> index，chunk-XYZ789.js -> chunk
 */
export function getChunkBaseName(fileName: string): string | null {
  const m = fileName.match(/^(.+)-[A-Za-z0-9]{6,10}\.(?:js|js\.map)$/);
  if (m) return m[1];
  const noExt = fileName.replace(/\.(js|js\.map)$/, "");
  return noExt || null;
}

/**
 * 从 outputFiles 建立 basename 和 base 索引，供 findChunkContent O(1) 查找
 *
 * 注意：chunkBaseIndex 仅当某 base 只有一个 chunk 时有效（如 routes-XXX、_layout-XXX）。
 * 多个 chunk-*.js 共享 base "chunk"，不能相互替代，故不写入 chunkBaseIndex。
 *
 * @param outputFiles 输出文件映射
 * @returns chunkContentIndex（basename->content）、chunkBaseIndex（base->content，仅单 chunk 的 base）
 */
export function buildChunkIndices(
  outputFiles: Map<string, string>,
): {
  chunkContentIndex: Map<string, string>;
  chunkBaseIndex: Map<string, string>;
} {
  const chunkContentIndex = new Map<string, string>();
  const chunkBaseIndex = new Map<string, string>();
  const baseCounts = new Map<string, number>();
  for (const [key, content] of outputFiles) {
    const name = basename(key);
    const existing = chunkContentIndex.get(name);
    // 冲突时优先保留内容更大的 chunk（与 outputFilesDev 构建逻辑一致）
    if (
      existing === undefined ||
      content.length > existing.length
    ) {
      chunkContentIndex.set(name, content);
    }
    const base = getChunkBaseName(name);
    if (base) {
      baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
    }
  }
  // 仅当 base 对应唯一 chunk 时写入 chunkBaseIndex（HMR 回退用）
  for (const [key, content] of outputFiles) {
    const name = basename(key);
    const base = getChunkBaseName(name);
    if (base && baseCounts.get(base) === 1) {
      chunkBaseIndex.set(base, content);
    }
  }
  return { chunkContentIndex, chunkBaseIndex };
}

/**
 * 从 outputFiles 中查找 chunk 内容（兼容多种 key 格式）
 *
 * 优先使用 chunkContentIndex/chunkBaseIndex 实现 O(1) 查找，未命中再回退到线性遍历。
 * 开发模式 HMR：旧主包请求 index-ABC123.js，重建后只有 index-XYZ789.js，
 * 按基础名回退：用同基础名的最新 chunk 内容，实现无感刷新。
 *
 * @param outputFiles 输出文件映射
 * @param fileName 请求的文件名（如 chunk-UUJCPQSG.js）
 * @param chunkContentIndex basename -> content 索引（可选，构建时建立）
 * @param chunkBaseIndex base -> content 索引（可选，用于 HMR 回退）
 * @returns 文件内容，未找到返回 undefined
 */
export function findChunkContent(
  outputFiles: Map<string, string> | undefined,
  fileName: string,
  chunkContentIndex?: Map<string, string>,
  chunkBaseIndex?: Map<string, string>,
): string | undefined {
  if (!outputFiles) return undefined;
  // 1. 优先查 basename 索引（O(1)）
  const fromContentIndex = chunkContentIndex?.get(fileName);
  if (fromContentIndex !== undefined) return fromContentIndex;
  // 1b. 多段路径兼容（如 routes/index-XXX.js）：chunkContentIndex 以 basename 为 key
  const fileNameBase = basename(fileName);
  if (fileNameBase !== fileName) {
    const fromBasenameIndex = chunkContentIndex?.get(fileNameBase);
    if (fromBasenameIndex !== undefined) return fromBasenameIndex;
  }
  // 2. 直接按 key 查找
  const direct = outputFiles.get(fileName);
  if (direct) return direct;
  // 3. 优先查 base 索引（HMR 回退，O(1)）
  const base = getChunkBaseName(fileName);
  if (base) {
    const fromBaseIndex = chunkBaseIndex?.get(base);
    if (fromBaseIndex !== undefined) return fromBaseIndex;
  }
  // 4. 回退：遍历查找（兼容 path/subdir/chunk-xxx.js 等格式，含多段路径）
  const matchName = fileName.includes("/") ? fileNameBase : fileName;
  for (const [key, content] of outputFiles) {
    if (basename(key) === matchName) return content;
  }
  // 5. Windows 兼容：按 basename 大小写不敏感匹配（esbuild 路径可能不同）
  for (const [key, content] of outputFiles) {
    if (basename(key).toLowerCase() === matchName.toLowerCase()) return content;
  }
  // 注意：base 为 "chunk" 时存在多个 chunk-*.js，不可用 base 回退，否则会返回错误 chunk
  return undefined;
}

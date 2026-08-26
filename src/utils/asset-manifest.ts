/**
 * Asset Manifest 工具
 *
 * 构建时 @dreamer/esbuild 的 AssetsProcessor 会生成 asset-manifest.json，
 * 供 SSR/Hybrid/SSG 在输出或读取 HTML 时替换资源路径（源码中的原始路径 → 带 hash 的路径）。
 */

import {
  cwd,
  join,
  readTextFile,
  stat,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "./build-dirs.ts";

/** 解析后的 manifest；null 表示缺失或无效 */
type AssetManifest = Record<string, string> | null;

interface AssetManifestCacheEntry {
  /** 文件 mtime（ms）；缺失时为 null */
  mtimeMs: number | null;
  manifest: AssetManifest;
}

/** 按绝对路径缓存；容量小，FIFO 淘汰 */
const ASSET_MANIFEST_CACHE_MAX = 8;
const assetManifestCache = new Map<string, AssetManifestCacheEntry>();

async function readMtimeMs(absPath: string): Promise<number | null> {
  try {
    const info = await stat(absPath);
    return info.mtime?.getTime() ?? 0;
  } catch {
    return null;
  }
}

function rememberAssetManifest(
  absPath: string,
  mtimeMs: number | null,
  manifest: AssetManifest,
): void {
  if (assetManifestCache.has(absPath)) {
    assetManifestCache.delete(absPath);
  }
  assetManifestCache.set(absPath, { mtimeMs, manifest });
  while (assetManifestCache.size > ASSET_MANIFEST_CACHE_MAX) {
    const oldest = assetManifestCache.keys().next().value;
    if (oldest === undefined) break;
    assetManifestCache.delete(oldest);
  }
}

/** 测试或热更新时清空 manifest 缓存 */
export function clearAssetManifestCache(): void {
  assetManifestCache.clear();
}

async function loadAssetManifest(
  manifestPath: string,
): Promise<AssetManifest> {
  const mtimeMs = await readMtimeMs(manifestPath);
  const hit = assetManifestCache.get(manifestPath);
  if (hit && hit.mtimeMs === mtimeMs) {
    return hit.manifest;
  }

  if (mtimeMs === null) {
    rememberAssetManifest(manifestPath, null, null);
    return null;
  }

  try {
    const raw = await readTextFile(manifestPath);
    const manifest = JSON.parse(raw) as Record<string, string>;
    rememberAssetManifest(manifestPath, mtimeMs, manifest);
    return manifest;
  } catch {
    rememberAssetManifest(manifestPath, mtimeMs, null);
    return null;
  }
}

/**
 * 用 asset-manifest.json 替换 HTML 中的资源路径
 *
 * @param html 原始 HTML
 * @param config 应用配置（用于获取 client output 或 ssg output）
 * @param outputDirOverride 可选，覆盖输出目录（如 SSG 的 ssg.outputDir）
 * @returns 替换后的 HTML
 */
export async function replaceAssetPathsInHtml(
  html: string,
  config: AppConfig,
  outputDirOverride?: string,
): Promise<string> {
  const buildConfig = (config.build || {}) as {
    client?: { output?: string };
  };
  const renderConfig = (config.render || {}) as {
    ssg?: { outputDir?: string };
  };
  const outputDir = outputDirOverride ??
    renderConfig.ssg?.outputDir ??
    buildConfig.client?.output ??
    getInferredBuildOutputDirs().client;
  const manifestPath = join(cwd(), outputDir, "asset-manifest.json");
  try {
    const manifest = await loadAssetManifest(manifestPath);
    if (!manifest) return html;
    let result = html;
    for (const [oldPath, newPath] of Object.entries(manifest)) {
      result = result.split(oldPath).join(newPath);
    }
    return result;
  } catch {
    return html;
  }
}

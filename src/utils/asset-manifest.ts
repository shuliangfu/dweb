/**
 * Asset Manifest 工具
 *
 * 构建时 @dreamer/esbuild 的 AssetsProcessor 会生成 asset-manifest.json，
 * 供 SSR/Hybrid/SSG 在输出或读取 HTML 时替换资源路径（源码中的原始路径 → 带 hash 的路径）。
 */

import { cwd, join, readTextFile, stat } from "../core/runtime-adapter.ts";
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

/**
 * 按 manifest 顺序做整页替换，与 `String.split` / `join` 一致。
 * 空 key、以及 key 与 value 相同的项跳过。
 */
export function applyAssetManifest(
  html: string,
  manifest: Record<string, string>,
): string {
  let result = html;
  for (const [oldPath, newPath] of Object.entries(manifest)) {
    if (!oldPath || oldPath === newPath) continue;
    result = result.split(oldPath).join(newPath);
  }
  return result;
}

/**
 * 流式替换，语义与 {@link applyAssetManifest} 相同。
 * 每个条目单独持有「可能跨 chunk 的前缀」，避免路径被切在两段之间。
 */
export function createAssetPathReplaceTransform(
  manifest: Record<string, string>,
): TransformStream<Uint8Array, Uint8Array> {
  const entries = Object.entries(manifest).filter(([oldPath, newPath]) =>
    oldPath.length > 0 && oldPath !== newPath
  );
  if (entries.length === 0) return new TransformStream();

  let readable: ReadableStream<Uint8Array> | null = null;
  let writable: WritableStream<Uint8Array> | null = null;
  for (const [oldPath, newPath] of entries) {
    const step = createSingleAssetPathTransform(oldPath, newPath);
    if (readable == null || writable == null) {
      readable = step.readable;
      writable = step.writable;
    } else {
      readable = readable.pipeThrough(step);
    }
  }
  return { readable: readable!, writable: writable! };
}

function createSingleAssetPathTransform(
  oldPath: string,
  newPath: string,
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  function enqueue(
    controller: TransformStreamDefaultController<Uint8Array>,
    text: string,
  ): void {
    if (text.length > 0) controller.enqueue(encoder.encode(text));
  }

  /** 吐出已不可能再匹配 oldPath 的前缀，留下最长的 oldPath 前缀。 */
  function drain(
    controller: TransformStreamDefaultController<Uint8Array>,
    flush: boolean,
  ): void {
    let out = "";
    while (true) {
      const idx = buffer.indexOf(oldPath);
      if (idx === -1) break;
      out += buffer.slice(0, idx) + newPath;
      buffer = buffer.slice(idx + oldPath.length);
    }
    if (flush) {
      out += buffer;
      buffer = "";
      enqueue(controller, out);
      return;
    }
    let keep = 0;
    const max = Math.min(buffer.length, oldPath.length - 1);
    for (let n = max; n > 0; n--) {
      if (oldPath.startsWith(buffer.slice(buffer.length - n))) {
        keep = n;
        break;
      }
    }
    out += buffer.slice(0, buffer.length - keep);
    buffer = buffer.slice(buffer.length - keep);
    enqueue(controller, out);
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      drain(controller, false);
    },
    flush(controller) {
      buffer += decoder.decode();
      drain(controller, true);
    },
  });
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
 * 读取构建产物里的 asset-manifest.json。缺失或无效时返回 null。
 */
export async function readAssetManifest(
  config: AppConfig,
  outputDirOverride?: string,
): Promise<Record<string, string> | null> {
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
    return await loadAssetManifest(manifestPath);
  } catch {
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
  const manifest = await readAssetManifest(config, outputDirOverride);
  if (!manifest) return html;
  return applyAssetManifest(html, manifest);
}

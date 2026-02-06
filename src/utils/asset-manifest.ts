/**
 * Asset Manifest 工具
 *
 * 构建时 @dreamer/esbuild 的 AssetsProcessor 会生成 asset-manifest.json，
 * 供 SSR/Hybrid/SSG 在输出或读取 HTML 时替换资源路径（源码中的原始路径 → 带 hash 的路径）。
 */

import {
  cwd,
  exists,
  join,
  readTextFile,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "./build-dirs.ts";

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
    if (!(await exists(manifestPath))) return html;
    const raw = await readTextFile(manifestPath);
    const manifest = JSON.parse(raw) as Record<string, string>;
    let result = html;
    for (const [oldPath, newPath] of Object.entries(manifest)) {
      result = result.split(oldPath).join(newPath);
    }
    return result;
  } catch {
    return html;
  }
}

/**
 * View SSR 路由 esbuild bundle（已移除；保留无操作导出供 HMR / 缓存清理调用处不变）。
 * 历史：曾用于服务端 `.tsx` 与客户端构建对齐的编译管线（已整体下线）。
 *
 * @module dweb/feature/view-ssr-route-bundle
 */

import { cwd, exists, join, remove } from "../core/runtime-adapter.ts";

/**
 * 每次加载路由前调用；现为 no-op。
 */
export function resetViewSsrBundleShutdownInterruptFlag(): void {}

/**
 * 是否因关闭进程导致 bundle 中断；现始终为 false。
 */
export function consumeViewSsrBundleShutdownInterruptFlag(): boolean {
  return false;
}

/**
 * 历史磁盘缓存目录（若曾生成过 bundle，可手动清理）。
 */
export function getViewSsrBundleDiskCacheDirs(): {
  outDir: string;
  cacheDir: string;
} {
  const root = join(cwd(), "runtime", "cache");
  return {
    outDir: join(root, "bundle-out"),
    cacheDir: join(root, "bundle-cache"),
  };
}

/** 内存 bundle 缓存已移除；no-op。 */
export function clearViewSsrBundledModuleMemoryCache(): void {}

/**
 * 尝试删除历史 `runtime/cache/bundle-*` 目录。
 */
export async function removeViewSsrBundleDiskCacheDirs(): Promise<void> {
  const { outDir, cacheDir } = getViewSsrBundleDiskCacheDirs();
  for (const dir of [cacheDir, outDir]) {
    try {
      if (await exists(dir)) {
        await remove(dir, { recursive: true });
      }
    } catch {
      /* 占用或权限：忽略 */
    }
  }
}

/** 文件变更时调用；现为 no-op。 */
export function clearViewSsrBundleCacheForPath(_changedPath: string): void {}

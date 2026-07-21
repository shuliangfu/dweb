/**
 * view-ssr-route-bundle 已 hollow：契约仍为 no-op / 固定路径，供调用方兼容。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  clearViewSsrBundleCacheForPath,
  clearViewSsrBundledModuleMemoryCache,
  consumeViewSsrBundleShutdownInterruptFlag,
  getViewSsrBundleDiskCacheDirs,
  removeViewSsrBundleDiskCacheDirs,
  resetViewSsrBundleShutdownInterruptFlag,
} from "../../src/feature/view-ssr-route-bundle.ts";

describe("view-ssr-route-bundle (hollow API)", () => {
  it("shutdown 标志应为 no-op 且始终 false", () => {
    resetViewSsrBundleShutdownInterruptFlag();
    expect(consumeViewSsrBundleShutdownInterruptFlag()).toBe(false);
  });

  it("磁盘缓存路径应落在 runtime/cache 下", () => {
    const dirs = getViewSsrBundleDiskCacheDirs();
    expect(dirs.outDir.replace(/\\/g, "/")).toMatch(
      /runtime\/cache\/bundle-out$/,
    );
    expect(dirs.cacheDir.replace(/\\/g, "/")).toMatch(
      /runtime\/cache\/bundle-cache$/,
    );
  });

  it("clear / remove 应可安全调用", async () => {
    clearViewSsrBundledModuleMemoryCache();
    clearViewSsrBundleCacheForPath("/any/path.tsx");
    await removeViewSsrBundleDiskCacheDirs();
  });
});

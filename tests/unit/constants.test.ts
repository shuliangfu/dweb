/**
 * constants 单元测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  CLIENT_CHUNK_PREFIX,
  CLIENT_ENTRY_FILENAME,
  CLIENT_OUTPUT_MAIN_FILENAME,
  CLIENT_SCRIPT_PATH,
  DEFAULT_CACHE_OPTIONS,
  DEFAULT_PRELOAD_MAX_PAGES,
  DEFAULT_PRELOAD_MAX_SIZE_MB,
  DEV_NO_CACHE_CONTROL,
  DWEB_DATA_PATH,
  getCacheOptions,
  HASHED_ASSET_CACHE_CONTROL,
  setCacheOptions,
} from "../../src/utils/constants.ts";

describe("constants", () => {
  it("路径常量应稳定", () => {
    expect(DWEB_DATA_PATH).toBe("/__data");
    expect(CLIENT_SCRIPT_PATH).toBe("/_client.js");
    expect(CLIENT_CHUNK_PREFIX).toBe("/_client/");
    expect(CLIENT_OUTPUT_MAIN_FILENAME).toBe("_client.js");
    expect(CLIENT_ENTRY_FILENAME).toBe("_client.tsx");
  });

  it("缓存头常量应含关键策略", () => {
    expect(HASHED_ASSET_CACHE_CONTROL).toContain("max-age=31536000");
    expect(HASHED_ASSET_CACHE_CONTROL).toContain("immutable");
    expect(DEV_NO_CACHE_CONTROL).toContain("no-store");
  });

  it("SSG 预读默认阈值应为正数", () => {
    expect(DEFAULT_PRELOAD_MAX_PAGES).toBeGreaterThan(0);
    expect(DEFAULT_PRELOAD_MAX_SIZE_MB).toBeGreaterThan(0);
  });

  it("setCacheOptions 应只接受正数并更新 getCacheOptions", () => {
    const before = { ...getCacheOptions() };
    setCacheOptions({
      maxCssRouteCacheSize: 123,
      maxVersionMapSize: 0, // 忽略
      evictionBatchInterval: -1, // 忽略
    });
    expect(getCacheOptions().maxCssRouteCacheSize).toBe(123);
    expect(getCacheOptions().maxVersionMapSize).toBe(before.maxVersionMapSize);
    // 恢复默认，避免污染其他用例
    setCacheOptions({ ...DEFAULT_CACHE_OPTIONS });
    expect(getCacheOptions().maxCssRouteCacheSize).toBe(
      DEFAULT_CACHE_OPTIONS.maxCssRouteCacheSize,
    );
  });
});

/**
 * P0 优化加固：缓存头、hashed 判定、loadCache 默认关
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  DATA_ENDPOINT_CACHE_CONTROL,
  HASHED_ASSET_CACHE_CONTROL,
  isHashedAssetFilename,
  UNHASHED_CLIENT_ENTRY_CACHE_CONTROL,
} from "../../src/utils/constants.ts";

describe("P0/P1 cache headers helpers", () => {
  it("isHashedAssetFilename：_client.js 不算 hashed", () => {
    expect(isHashedAssetFilename("_client.js")).toBe(false);
    expect(isHashedAssetFilename("_client.js.map")).toBe(false);
  });

  it("isHashedAssetFilename：带 hash 的 chunk 算 hashed", () => {
    expect(isHashedAssetFilename("index-a1b2c3d4.js")).toBe(true);
    expect(isHashedAssetFilename("chunk-Ab12Cd.js")).toBe(true);
    expect(isHashedAssetFilename("chunk-Ab12Cd.js.map")).toBe(true);
  });

  it("未哈希入口与 hashed 的 Cache-Control 必须不同", () => {
    expect(UNHASHED_CLIENT_ENTRY_CACHE_CONTROL).toContain("must-revalidate");
    expect(UNHASHED_CLIENT_ENTRY_CACHE_CONTROL).not.toContain("immutable");
    expect(HASHED_ASSET_CACHE_CONTROL).toContain("immutable");
  });

  it("__data 必须使用 no-store", () => {
    expect(DATA_ENDPOINT_CACHE_CONTROL).toBe("no-store");
  });
});

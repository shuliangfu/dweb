/**
 * Asset Manifest 工具测试
 *
 * 测试 src/utils/asset-manifest.ts 的功能：
 * - replaceAssetPathsInHtml 用 manifest 替换 HTML 中的资源路径
 * - manifest 不存在时返回原 HTML
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { replaceAssetPathsInHtml } from "../../src/utils/asset-manifest.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("replaceAssetPathsInHtml (asset-manifest.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-asset-manifest-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("manifest 不存在时应返回原 HTML", async () => {
    const html = '<script src="/_client/main.js"></script>';
    const config = {
      build: { client: { output: "dist/client", engine: "preact" as const } },
    } as AppConfig;
    const result = await replaceAssetPathsInHtml(html, config);
    expect(result).toBe(html);
  });

  it("manifest 存在时应替换路径", async () => {
    const outputDir = join(testDir, "dist", "client");
    await ensureDir(outputDir);
    await writeTextFile(
      join(outputDir, "asset-manifest.json"),
      JSON.stringify({
        "/_client/main.js": "/_client/main.abc123.js",
      }),
    );

    const html = '<script src="/_client/main.js"></script>';
    const config: AppConfig = {
      build: { client: { output: "dist/client", engine: "preact" } },
    };
    const result = await replaceAssetPathsInHtml(html, config);
    expect(result).toContain("main.abc123.js");
  });

  it("outputDirOverride 应覆盖配置中的 output", async () => {
    const customDir = join(testDir, "custom-output");
    await ensureDir(customDir);
    await writeTextFile(
      join(customDir, "asset-manifest.json"),
      JSON.stringify({
        "old.css": "new.hash.css",
      }),
    );

    const html = '<link href="old.css" rel="stylesheet">';
    const config: AppConfig = {};
    const result = await replaceAssetPathsInHtml(html, config, "custom-output");
    expect(result).toContain("new.hash.css");
  });

  it("manifest 存在但 JSON 解析失败时应返回原 HTML", async () => {
    const outputDir = join(testDir, "dist", "client");
    await ensureDir(outputDir);
    await writeTextFile(
      join(outputDir, "asset-manifest.json"),
      "invalid json {",
    );

    const html = '<script src="/_client/main.js"></script>';
    const config: AppConfig = {
      build: { client: { output: "dist/client", engine: "preact" } },
    };
    const result = await replaceAssetPathsInHtml(html, config);
    expect(result).toBe(html);
  });
});

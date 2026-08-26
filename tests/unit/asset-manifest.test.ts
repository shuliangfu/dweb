/**
 * Asset Manifest 工具测试
 *
 * 测试 src/utils/asset-manifest.ts 的功能：
 * - replaceAssetPathsInHtml 用 manifest 替换 HTML 中的资源路径
 * - manifest 不存在时返回原 HTML
 * - mtime 缓存命中 / 失效 / clearAssetManifestCache
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
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@dreamer/test";
import {
  clearAssetManifestCache,
  replaceAssetPathsInHtml,
} from "../../src/utils/asset-manifest.ts";
import type { AppConfig } from "../../src/types/app.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  beforeEach(() => {
    clearAssetManifestCache();
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
    const outputDir = join(testDir, "dist", "client-bad-json");
    await ensureDir(outputDir);
    await writeTextFile(
      join(outputDir, "asset-manifest.json"),
      "invalid json {",
    );

    const html = '<script src="/_client/main.js"></script>';
    const config: AppConfig = {
      build: { client: { output: "dist/client-bad-json", engine: "preact" } },
    };
    const result = await replaceAssetPathsInHtml(html, config);
    expect(result).toBe(html);
  });

  it("mtime 未变时第二次替换应复用缓存结果", async () => {
    const outputDir = join(testDir, "dist", "client-cache-hit");
    await ensureDir(outputDir);
    const manifestFile = join(outputDir, "asset-manifest.json");
    await writeTextFile(
      manifestFile,
      JSON.stringify({ "/a.js": "/a.hash1.js" }),
    );

    const html = '<script src="/a.js"></script>';
    const config: AppConfig = {
      build: { client: { output: "dist/client-cache-hit", engine: "preact" } },
    };
    const first = await replaceAssetPathsInHtml(html, config);
    expect(first).toContain("/a.hash1.js");

    // 不更新 mtime 时覆盖写入仍可能 bump mtime；此处验证二次调用行为稳定
    const second = await replaceAssetPathsInHtml(html, config);
    expect(second).toBe(first);
  });

  it("mtime 变更后应读取新 manifest", async () => {
    const outputDir = join(testDir, "dist", "client-cache-mtime");
    await ensureDir(outputDir);
    const manifestFile = join(outputDir, "asset-manifest.json");
    await writeTextFile(
      manifestFile,
      JSON.stringify({ "/b.js": "/b.old.js" }),
    );

    const html = '<script src="/b.js"></script>';
    const config: AppConfig = {
      build: {
        client: { output: "dist/client-cache-mtime", engine: "preact" },
      },
    };
    const first = await replaceAssetPathsInHtml(html, config);
    expect(first).toContain("/b.old.js");

    await sleep(20);
    await writeTextFile(
      manifestFile,
      JSON.stringify({ "/b.js": "/b.new.js" }),
    );
    const second = await replaceAssetPathsInHtml(html, config);
    expect(second).toContain("/b.new.js");
  });

  it("缺失后出现的 manifest 应被加载", async () => {
    const outputDir = join(testDir, "dist", "client-appear");
    await ensureDir(outputDir);
    const manifestFile = join(outputDir, "asset-manifest.json");
    const html = '<script src="/c.js"></script>';
    const config: AppConfig = {
      build: { client: { output: "dist/client-appear", engine: "preact" } },
    };

    const missing = await replaceAssetPathsInHtml(html, config);
    expect(missing).toBe(html);

    await writeTextFile(
      manifestFile,
      JSON.stringify({ "/c.js": "/c.hash.js" }),
    );
    const present = await replaceAssetPathsInHtml(html, config);
    expect(present).toContain("/c.hash.js");
  });

  it("clearAssetManifestCache 后应重新读取磁盘", async () => {
    const outputDir = join(testDir, "dist", "client-clear");
    await ensureDir(outputDir);
    const manifestFile = join(outputDir, "asset-manifest.json");
    await writeTextFile(
      manifestFile,
      JSON.stringify({ "/d.js": "/d.v1.js" }),
    );

    const html = '<script src="/d.js"></script>';
    const config: AppConfig = {
      build: { client: { output: "dist/client-clear", engine: "preact" } },
    };
    expect(await replaceAssetPathsInHtml(html, config)).toContain("/d.v1.js");

    clearAssetManifestCache();
    await sleep(20);
    await writeTextFile(
      manifestFile,
      JSON.stringify({ "/d.js": "/d.v2.js" }),
    );
    expect(await replaceAssetPathsInHtml(html, config)).toContain("/d.v2.js");
  });
});

/**
 * 升级提示客户端说明符：远程 URL 必须物化/改写，不能写进 _client.dep.tsx。
 */
import "../setup.ts";
import {
  join,
  makeTempDir,
  readTextFile,
  remove,
} from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  DWEB_APP_VERSION_STORAGE_KEY,
  DWEB_VERSION_PATH,
  DWEB_VERSION_STREAM_PATH,
} from "../../src/utils/constants.ts";
import {
  materializeUpgradePromptClient,
  rewriteMaterializedUpgradePromptClient,
  slimUpgradePromptConstantsSource,
  specifierFromPackageImports,
  toBundledUpgradePromptSpecifier,
  UPGRADE_PROMPT_PACKAGE_SPECIFIER,
  UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER,
  upgradePromptClientSpecifier,
  upgradePromptClientSpecifierFromUrl,
} from "../../src/feature/upgrade-prompt-client-spec.ts";

describe("upgrade-prompt-client-spec", () => {
  it("storage 客户端说明符来自本包 deno.json，不写死版本", async () => {
    const denoConfig = (
      await import("../../deno.json", { with: { type: "json" } })
    ).default as { imports?: Record<string, string> };
    const fromConfig = specifierFromPackageImports(
      denoConfig.imports ?? {},
      "@dreamer/storage/client",
    );
    expect(fromConfig).toBeTruthy();
    expect(UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER).toBe(fromConfig);
    expect(
      UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER.startsWith(
        "jsr:@dreamer/storage@",
      ),
    ).toBe(true);
    expect(UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER.endsWith("/client")).toBe(
      true,
    );
  });

  it("specifierFromPackageImports 可从包根说明符拼接子路径", () => {
    expect(
      specifierFromPackageImports(
        { "@dreamer/storage": "jsr:@dreamer/storage@^2.0.0" },
        "@dreamer/storage/client",
      ),
    ).toBe("jsr:@dreamer/storage@^2.0.0/client");
  });

  it('说明符模块不得使用 with { type: "text" }，以免 esbuild 打包失败', async () => {
    const { fromFileUrl } = await import("../../src/utils/version.ts");
    const url = new URL(
      "../../src/feature/upgrade-prompt-client-spec.ts",
      import.meta.url,
    );
    const source = await readTextFile(fromFileUrl(url.href));
    expect(source).not.toContain('from "./upgrade-prompt-client.ts" with');
    expect(source).not.toContain('from "../utils/project-version.ts" with');
  });

  it("file:// 转为文件系统路径，不含协议", () => {
    const specifier = upgradePromptClientSpecifierFromUrl(
      "file:///Users/demo/dweb/src/feature/upgrade-prompt-client.ts",
    );
    expect(specifier).toBe(
      "/Users/demo/dweb/src/feature/upgrade-prompt-client.ts",
    );
    expect(specifier).not.toContain("file://");
  });

  it("https://jsr.io 不得原样返回，改为包导出", () => {
    const specifier = upgradePromptClientSpecifierFromUrl(
      "https://jsr.io/@dreamer/dweb/3.10.0/src/feature/upgrade-prompt-client.ts",
    );
    expect(specifier).toBe(UPGRADE_PROMPT_PACKAGE_SPECIFIER);
    expect(specifier).not.toContain("https://");
  });

  it("本机模块说明符不含 file:// 或 https://", () => {
    const specifier = upgradePromptClientSpecifier();
    expect(specifier).not.toContain("file://");
    expect(specifier).not.toContain("https://");
    expect(
      specifier.includes("upgrade-prompt-client.ts") ||
        specifier === UPGRADE_PROMPT_PACKAGE_SPECIFIER,
    ).toBe(true);
  });

  it("toBundledUpgradePromptSpecifier 会拦截残留的远程 URL", () => {
    expect(
      toBundledUpgradePromptSpecifier(
        "https://jsr.io/@dreamer/dweb/3.10.0/src/feature/upgrade-prompt-client.ts",
      ),
    ).toBe(UPGRADE_PROMPT_PACKAGE_SPECIFIER);
    expect(
      toBundledUpgradePromptSpecifier(
        "file:///tmp/upgrade-prompt-client.ts",
      ),
    ).toBe("/tmp/upgrade-prompt-client.ts");
  });

  it("精简常量源与框架常量一致", () => {
    const source = slimUpgradePromptConstantsSource();
    expect(source).toContain(JSON.stringify(DWEB_VERSION_PATH));
    expect(source).toContain(JSON.stringify(DWEB_VERSION_STREAM_PATH));
    expect(source).toContain(JSON.stringify(DWEB_APP_VERSION_STORAGE_KEY));
  });

  it("物化改写把相对导入和 storage 说明符收成本地可打包形式", () => {
    const rewritten = rewriteMaterializedUpgradePromptClient(
      [
        'import { BrowserStorage } from "@dreamer/storage/client";',
        'import { DWEB_APP_VERSION_STORAGE_KEY } from "../utils/constants.ts";',
        'import { isProjectVersionGreater } from "../utils/project-version.ts";',
      ].join("\n"),
    );
    expect(rewritten).toContain(
      `from "${UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER}"`,
    );
    expect(rewritten).toContain('from "./constants.ts"');
    expect(rewritten).toContain('from "./project-version.ts"');
    expect(rewritten).not.toContain('from "@dreamer/storage/client"');
    expect(rewritten).not.toContain("../utils/");
  });

  it("materializeUpgradePromptClient 写出可打包的本地文件", async () => {
    const dir = await makeTempDir();
    try {
      const clientPath = await materializeUpgradePromptClient(dir);
      expect(clientPath.includes("_upgrade-prompt")).toBe(true);
      expect(clientPath.endsWith("client.ts")).toBe(true);
      const source = await readTextFile(clientPath);
      expect(source).toContain("export function startUpgradePrompt");
      expect(source).toContain(
        `from "${UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER}"`,
      );
      expect(source).toContain('from "./constants.ts"');
      expect(source).not.toContain("https://");
      expect(source).not.toContain("../utils/");
      const constants = await readTextFile(
        join(dir, "_upgrade-prompt", "constants.ts"),
      );
      expect(constants).toContain(JSON.stringify(DWEB_APP_VERSION_STORAGE_KEY));
    } finally {
      await remove(dir, { recursive: true });
    }
  });
});

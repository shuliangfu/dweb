/**
 * dweb-cli run 合并项目 import map
 */

import "../setup.ts";
import {
  join,
  makeTempDir,
  remove,
  resolve,
  setEnv,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterEach, describe, expect, it } from "@dreamer/test";
import {
  buildRuntimeDenoConfig,
  installRuntimeAliasResolver,
  loadProjectPathAliases,
  mergeProjectImports,
  pathAliasesFromImports,
  PROJECT_CONFIG_ENV,
  projectImportMapAlreadyActive,
  reexecWithProjectImportMap,
  resolveImportMapSpecifier,
  resolvePathAlias,
} from "../../src/utils/project-import-map.ts";

/** Match resolveImportMapSpecifier's file URL rules on every OS, including Windows drive letters. */
function fileUrlFrom(fromDir: string, spec: string): string {
  const abs = resolve(fromDir, spec).replace(/\\/g, "/");
  const url = abs.startsWith("/") ? `file://${abs}` : `file:///${abs}`;
  return spec.endsWith("/") && !url.endsWith("/") ? `${url}/` : url;
}

describe("project-import-map", () => {
  it("keeps remote specs and turns relative specs into file URLs", () => {
    expect(resolveImportMapSpecifier("jsr:@dreamer/console@^1.1.1", "/tmp"))
      .toEqual(
        "jsr:@dreamer/console@^1.1.1",
      );
    const adminDir = resolve("/apps/admin");
    const dwebDir = resolve("/apps/dweb");
    expect(resolveImportMapSpecifier("./common/", adminDir)).toEqual(
      fileUrlFrom(adminDir, "./common/"),
    );
    expect(resolveImportMapSpecifier("../console/src/mod.ts", dwebDir))
      .toEqual(
        fileUrlFrom(dwebDir, "../console/src/mod.ts"),
      );
  });

  it("lets project aliases override the CLI map and resolves relatives to file URLs", () => {
    const adminDir = resolve("/apps/admin");
    const dwebDir = resolve("/apps/dweb");
    const imports = mergeProjectImports(
      { "@common/": "./common/", "@dreamer/dweb": "jsr:@dreamer/dweb@^3.9.5" },
      adminDir,
      {
        "@dreamer/console": "jsr:@dreamer/console@^1.1.1",
        "@dreamer/dweb": "./src/mod.ts",
      },
      dwebDir,
    );
    expect(imports["@common/"]).toEqual(fileUrlFrom(adminDir, "./common/"));
    expect(imports["@dreamer/dweb"]).toEqual("jsr:@dreamer/dweb@^3.9.5");
    expect(imports["@dreamer/console"]).toEqual("jsr:@dreamer/console@^1.1.1");
  });

  it("disables lock on the merged runtime config", () => {
    const cfg = buildRuntimeDenoConfig(
      { imports: { "@common/": "./common/" }, lock: "./deno.lock" },
      { "@common/": "./common/" },
    );
    expect(cfg.lock).toEqual(false);
    expect((cfg.imports as Record<string, string>)["@common/"]).toEqual(
      "./common/",
    );
  });

  it("maps package.json path aliases to absolute paths and skips remotes", () => {
    const adminDir = resolve("/apps/admin");
    const aliases = pathAliasesFromImports(
      {
        "@common/*": "./common/*",
        "@common/": "./common/",
        "@dreamer/dweb": "jsr:@dreamer/dweb@^3.9.5",
        "#common/*": "./common/*",
      },
      adminDir,
    );
    expect(aliases["@common/"]).toEqual(resolve(adminDir, "./common/"));
    expect(aliases["#common/"]).toEqual(resolve(adminDir, "./common/"));
    expect(aliases["@dreamer/dweb"]).toBeUndefined();
  });

  it("resolves a specifier against the longest matching alias", () => {
    const adminDir = resolve("/apps/admin");
    const aliases = pathAliasesFromImports(
      { "@common/": "./common/" },
      adminDir,
    );
    expect(resolvePathAlias("@common/ping.ts", aliases)).toEqual(
      resolve(adminDir, "common/ping.ts"),
    );
    expect(resolvePathAlias("@other/ping.ts", aliases)).toBeUndefined();
  });

  it("keeps npm, http and file specs, and leaves bare specs unchanged", () => {
    expect(resolveImportMapSpecifier("npm:preact@10", "/tmp")).toBe(
      "npm:preact@10",
    );
    expect(resolveImportMapSpecifier("http://example.test/a.js", "/tmp")).toBe(
      "http://example.test/a.js",
    );
    expect(resolveImportMapSpecifier("https://example.test/a.js", "/tmp")).toBe(
      "https://example.test/a.js",
    );
    expect(resolveImportMapSpecifier("file:///abs/mod.ts", "/tmp")).toBe(
      "file:///abs/mod.ts",
    );
    expect(resolveImportMapSpecifier("preact", "/tmp")).toBe("preact");
  });

  it("mergeProjectImports 在缺少 fromDir 时保留原值", () => {
    const imports = mergeProjectImports(
      { "@app/": "./src/" },
      undefined,
      { "@cli/": "./cli/" },
      undefined,
    );
    expect(imports["@app/"]).toBe("./src/");
    expect(imports["@cli/"]).toBe("./cli/");
  });

  it("pathAliasesFromImports 处理空 map、file URL、精确键，并跳过裸说明符", () => {
    expect(pathAliasesFromImports(undefined, "/tmp")).toEqual({});
    const dir = resolve("/apps/admin");
    const aliases = pathAliasesFromImports(
      {
        "@exact": "file:///virtual/exact.ts",
        "@skip": "bare-package",
        "@num": 1 as unknown as string,
      },
      dir,
    );
    expect(aliases["@skip"]).toBeUndefined();
    expect(aliases["@num"]).toBeUndefined();
    expect(aliases["@exact"].replace(/\\/g, "/")).toContain("exact.ts");
  });

  it("resolvePathAlias 精确键应命中，前缀键按最长匹配", () => {
    const aliases = {
      "@lib": "/abs/lib.ts",
      "@lib/": "/abs/lib/",
    };
    expect(resolvePathAlias("@lib", aliases)).toBe("/abs/lib.ts");
    const nested = resolvePathAlias("@lib/util.ts", aliases);
    expect(nested).toBeDefined();
    expect(nested!.replace(/\\/g, "/")).toContain("util.ts");
    expect(resolvePathAlias("@missing", aliases)).toBeUndefined();
  });

  it("loadProjectPathAliases 应合并 deno.json 与 package.json，后者覆盖同名键", async () => {
    const dir = await makeTempDir({ prefix: "dweb-aliases-" });
    try {
      await writeTextFile(
        join(dir, "deno.json"),
        JSON.stringify({
          imports: {
            "@common/": "./from-deno/",
            "@only-deno/": "./deno-only/",
            "@dreamer/view": "jsr:@dreamer/view@^3",
          },
        }),
      );
      await writeTextFile(
        join(dir, "package.json"),
        JSON.stringify({
          imports: {
            "@common/": "./from-pkg/",
          },
        }),
      );
      const aliases = await loadProjectPathAliases(dir);
      expect(aliases["@common/"]).toEqual(resolve(dir, "from-pkg/"));
      expect(aliases["@only-deno/"]).toEqual(resolve(dir, "deno-only/"));
      expect(aliases["@dreamer/view"]).toBeUndefined();
    } finally {
      await remove(dir, { recursive: true });
    }
  });

  it("loadProjectPathAliases 在只有 deno.jsonc 时也能读取", async () => {
    const dir = await makeTempDir({ prefix: "dweb-aliases-jsonc-" });
    try {
      await writeTextFile(
        join(dir, "deno.jsonc"),
        JSON.stringify({ imports: { "@x/": "./x/" } }),
      );
      const aliases = await loadProjectPathAliases(dir);
      expect(aliases["@x/"]).toEqual(resolve(dir, "x/"));
    } finally {
      await remove(dir, { recursive: true });
    }
  });

  it("installRuntimeAliasResolver 在没有别名时直接返回", async () => {
    await installRuntimeAliasResolver({});
  });

  it("projectImportMapAlreadyActive 在别名已解析到项目目标时为 true，缺别名或指到别处时为 false", () => {
    const dir = resolve("/apps/admin");
    const imports = {
      "@common/": "./src/common/",
      "@dreamer/dweb": "../dweb/src/mod.ts",
      "@dreamer/config": "jsr:@dreamer/config@^1.1.1",
    };
    const resolved: Record<string, string> = {
      "@common/__dweb_reexec_probe": resolveImportMapSpecifier(
        "./src/common/__dweb_reexec_probe",
        dir,
      ),
      "@dreamer/dweb": resolveImportMapSpecifier("../dweb/src/mod.ts", dir),
      "@dreamer/config": "jsr:@dreamer/config@^1.1.1",
    };
    expect(projectImportMapAlreadyActive(imports, dir, (s) => {
      if (!(s in resolved)) throw new Error(`unmapped ${s}`);
      return resolved[s]!;
    })).toBe(true);

    expect(projectImportMapAlreadyActive(imports, dir, (s) => {
      if (s.startsWith("@common/")) throw new Error("unmapped");
      if (!(s in resolved)) throw new Error(`unmapped ${s}`);
      return resolved[s]!;
    })).toBe(false);

    expect(projectImportMapAlreadyActive(imports, dir, (s) => {
      if (s.startsWith("@common/")) {
        return resolveImportMapSpecifier(
          "./other/common/__dweb_reexec_probe",
          dir,
        );
      }
      if (!(s in resolved)) throw new Error(`unmapped ${s}`);
      return resolved[s]!;
    })).toBe(false);

    expect(projectImportMapAlreadyActive({}, dir, () => "x")).toBe(false);
    expect(projectImportMapAlreadyActive(undefined, dir, () => "x")).toBe(
      false,
    );
  });

  it("reexecWithProjectImportMap 在环境变量已设置或没有配置文件时直接返回", async () => {
    setEnv(PROJECT_CONFIG_ENV, "1");
    const dir = await makeTempDir({ prefix: "dweb-reexec-" });
    try {
      await reexecWithProjectImportMap(dir);
      setEnv(PROJECT_CONFIG_ENV, "");
      await reexecWithProjectImportMap(dir);
    } finally {
      setEnv(PROJECT_CONFIG_ENV, "1");
      await remove(dir, { recursive: true });
    }
  });
});

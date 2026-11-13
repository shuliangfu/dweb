/**
 * dweb-cli run 合并项目 import map
 */

import "../setup.ts";
import { resolve } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  buildRuntimeDenoConfig,
  mergeProjectImports,
  pathAliasesFromImports,
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
});

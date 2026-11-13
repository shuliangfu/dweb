/**
 * dweb-cli run 合并项目 import map
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  buildRuntimeDenoConfig,
  mergeProjectImports,
  resolveImportMapSpecifier,
} from "../../src/utils/project-import-map.ts";

describe("project-import-map", () => {
  it("keeps remote specs and turns relative specs into file URLs", () => {
    expect(resolveImportMapSpecifier("jsr:@dreamer/console@^1.1.1", "/tmp"))
      .toEqual(
        "jsr:@dreamer/console@^1.1.1",
      );
    expect(resolveImportMapSpecifier("./common/", "/apps/admin")).toEqual(
      "file:///apps/admin/common/",
    );
    expect(resolveImportMapSpecifier("../console/src/mod.ts", "/apps/dweb"))
      .toEqual(
        "file:///apps/console/src/mod.ts",
      );
  });

  it("lets project aliases override the CLI map and resolves relatives to file URLs", () => {
    const imports = mergeProjectImports(
      { "@common/": "./common/", "@dreamer/dweb": "jsr:@dreamer/dweb@^3.9.5" },
      "/apps/admin",
      {
        "@dreamer/console": "jsr:@dreamer/console@^1.1.1",
        "@dreamer/dweb": "./src/mod.ts",
      },
      "/apps/dweb",
    );
    expect(imports["@common/"]).toEqual("file:///apps/admin/common/");
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
});

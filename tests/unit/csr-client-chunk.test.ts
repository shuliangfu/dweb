/**
 * csr-client-chunk 直接覆盖（不经 builder re-export）
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  buildRouteChunkUrlMap,
  getChunkBaseName,
  getChunkFileNameForComponent,
  getChunkFileNameFromMetafile,
  isClientChunkFile,
} from "../../src/feature/csr-client-chunk.ts";

describe("csr-client-chunk", () => {
  it("buildRouteChunkUrlMap 应映射存在的 chunk", () => {
    const map = buildRouteChunkUrlMap(
      [{ componentPath: "about" }, { componentPath: "missing" }],
      ["about-ABCDEF.js", "_client.js"],
    );
    expect(map.about).toBe("/about-ABCDEF.js");
    expect(map.missing).toBeUndefined();
  });

  it("getChunkBaseName / isClientChunkFile 边界", () => {
    expect(getChunkBaseName("index-Ab12Cd.js")).toBe("index");
    expect(isClientChunkFile("/chunk-ABCDEF.js")).toBe(true);
    expect(isClientChunkFile("/_client.js")).toBe(false);
  });

  it("末段唯一 create-*.js 应匹配深层路径", () => {
    expect(
      getChunkFileNameForComponent("workspace/projects/create", [
        "create-HASH01.js",
        "_client.js",
      ]),
    ).toBe("create-HASH01.js");
  });

  it("多层 */index 应匹配父目录名 devices-*.js", () => {
    expect(
      getChunkFileNameForComponent("cgm/devices/index", [
        "devices-WSM3PMXT.js",
        "routes-D6EYJ3G4.js",
        "wearing-EZNRII2O.js",
        "_client.js",
      ]),
    ).toBe("devices-WSM3PMXT.js");
  });

  it("父目录名对应多个 devices-*.js 时不模糊匹配", () => {
    expect(
      getChunkFileNameForComponent("cgm/devices/index", [
        "devices-AAAAAA.js",
        "devices-BBBBBB.js",
        "_client.js",
      ]),
    ).toBeNull();
  });

  it("两个 routes-*.js 时根 index 不得取第一个", () => {
    expect(
      getChunkFileNameForComponent("index", [
        "routes-D6EYJ3G4.js",
        "routes-5GOQUFEK.js",
        "_client.js",
      ]),
    ).toBeNull();
  });

  it("metafile.entryPoint 应把仪表盘与插件 routes 页分到各自 chunk", () => {
    const names = [
      "routes-D6EYJ3G4.js",
      "routes-5GOQUFEK.js",
      "_client.js",
    ];
    const dashboard =
      "/Users/shuliangfu/worker/deno/dreamer-jsr/senvis/src/backend/routes/index.tsx";
    const plugin =
      "/Users/shuliangfu/worker/deno/dreamer-jsr/plugins/src/rbac/routes/routes/index.tsx";
    const metafile = {
      outputs: {
        "mem/routes-D6EYJ3G4.js": { entryPoint: dashboard },
        "mem/routes-5GOQUFEK.js": { entryPoint: plugin },
        "mem/_client.js": { entryPoint: "src/backend/_client.dep.tsx" },
      },
    };
    expect(getChunkFileNameFromMetafile(dashboard, names, metafile)).toBe(
      "routes-D6EYJ3G4.js",
    );
    expect(getChunkFileNameFromMetafile(plugin, names, metafile)).toBe(
      "routes-5GOQUFEK.js",
    );
    expect(
      getChunkFileNameForComponent("index", names, {
        sourcePath: dashboard,
        metafile,
      }),
    ).toBe("routes-D6EYJ3G4.js");
    expect(
      getChunkFileNameForComponent("rbac/routes", names, {
        sourcePath: plugin,
        metafile,
      }),
    ).toBe("routes-5GOQUFEK.js");
    const map = buildRouteChunkUrlMap(
      [
        { componentPath: "index", fullPath: dashboard },
        { componentPath: "rbac/routes", fullPath: plugin },
      ],
      names,
      metafile,
    );
    expect(map.index).toBe("/routes-D6EYJ3G4.js");
    expect(map["rbac/routes"]).toBe("/routes-5GOQUFEK.js");
  });

  it("短 entryPoint routes/index.tsx 不得把插件源文件配到宿主仪表盘 chunk", () => {
    const names = ["routes-HOME01.js", "routes-RBAC01.js", "_client.js"];
    const dashboard = "/app/src/backend/routes/index.tsx";
    const plugin = "/plugins/src/rbac/routes/routes/index.tsx";
    const metafile = {
      outputs: {
        "mem/routes-HOME01.js": { entryPoint: "routes/index.tsx" },
        "mem/routes-RBAC01.js": { entryPoint: plugin },
      },
    };
    expect(
      getChunkFileNameForComponent("index", names, {
        sourcePath: dashboard,
        metafile,
      }),
    ).toBe("routes-HOME01.js");
    expect(
      getChunkFileNameForComponent("rbac/routes", names, {
        sourcePath: plugin,
        metafile,
      }),
    ).toBe("routes-RBAC01.js");
  });
});

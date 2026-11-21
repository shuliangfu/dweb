/**
 * 客户端入口脚手架 _client.tsx 生成
 */

import "../setup.ts";
import { join, resolve } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  generateStaticClientEntry,
  getComponentPathFromFilePath,
  isNonRouteSrcUnderAppSrc,
} from "../../src/feature/csr-client-entry.ts";

describe("generateStaticClientEntry()", () => {
  it("应把路由 console.log 写成注释，保留 console.error", () => {
    const code = generateStaticClientEntry("view", [], false, []);
    const uncommented = code.replace(/^\s*\/\/.*$/gm, "");
    expect(code).toMatch(/\/\/\s*console\.log\(/);
    expect(uncommented).not.toMatch(/console\.log\s*\(/);
    expect(uncommented).toContain("console.error");
  });
});

describe("getComponentPathFromFilePath()", () => {
  it("应取出 routes 下的相对路径，不在 routes 内时返回 null", () => {
    const routes = "/app/src/routes";
    expect(getComponentPathFromFilePath(routes, "/app/src/routes/index.tsx"))
      .toBe("index");
    expect(
      getComponentPathFromFilePath(routes, "/app/src/routes/user/[id].ts"),
    ).toBe("user/[id]");
    expect(getComponentPathFromFilePath(routes, "/app/src/config/main.ts"))
      .toBeNull();
  });
});

describe("isNonRouteSrcUnderAppSrc()", () => {
  it("src 下但非 routes 的文件为 true，routes 内或 src 外为 false", () => {
    const tmp = resolve("/tmp/dweb-csr-src");
    const routes = join(tmp, "src", "routes");
    expect(
      isNonRouteSrcUnderAppSrc(routes, join(tmp, "src", "config", "main.ts")),
    )
      .toBe(true);
    expect(isNonRouteSrcUnderAppSrc(routes, join(routes, "index.tsx"))).toBe(
      false,
    );
    expect(isNonRouteSrcUnderAppSrc(routes, join(tmp, "other", "a.ts"))).toBe(
      false,
    );
  });
});

/**
 * rewriteServerExternalSpecifiers：生产 server.js 协议 external → 裸包名
 */
import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { rewriteServerExternalSpecifiers } from "../../src/utils/rewrite-server-externals.ts";

describe("rewriteServerExternalSpecifiers", () => {
  it("将 @jsr/scope__name 改成 @scope/name（含亚路径）", () => {
    const src = `import * as a from "@jsr/dreamer__runtime-adapter";\n` +
      `import { x } from '@jsr/dreamer__view/jsx-runtime';\n`;
    const out = rewriteServerExternalSpecifiers(src);
    expect(out).toContain('"@dreamer/runtime-adapter"');
    expect(out).toContain("'@dreamer/view/jsx-runtime'");
    expect(out).not.toContain("@jsr/dreamer__");
  });

  it("将 jsr:@scope/name@version 改成 @scope/name（含亚路径，去版本）", () => {
    const src = `import * as a from "jsr:@dreamer/runtime-adapter@^1.2.2";\n` +
      `import { x } from "jsr:@dreamer/plugins@^1.2.0/static";\n` +
      `import { y } from "jsr:@dreamer/runtime-adapter@^1.0.18-beta.26";\n`;
    const out = rewriteServerExternalSpecifiers(src);
    expect(out).toContain('"@dreamer/runtime-adapter"');
    expect(out).toContain('"@dreamer/plugins/static"');
    expect(out).not.toContain("jsr:@dreamer/");
    // 两个不同版本应折叠到同一裸名
    expect(out.match(/@dreamer\/runtime-adapter/g)?.length).toBe(2);
  });

  it("将 npm: 协议改成裸包名，保留 i18n 文案中的 npm: 前缀", () => {
    const src = `import React from "npm:react@^19.3.1";\n` +
      `import P from "npm:preact@^11.1.1/hooks";\n` +
      `const msg = "npm: 导入视为 external。";\n` +
      `const de = "npm:-Imports als external behandeln.";\n`;
    const out = rewriteServerExternalSpecifiers(src);
    expect(out).toContain('"react"');
    expect(out).toContain('"preact/hooks"');
    expect(out).toContain('"npm: 导入视为 external。"');
    expect(out).toContain('"npm:-Imports als external behandeln."');
  });

  it("无协议 external 时原样返回", () => {
    const src = `import { x } from "@dreamer/runtime-adapter";\n`;
    expect(rewriteServerExternalSpecifiers(src)).toBe(src);
  });
});

/**
 * strip-load-plugin 单元测试：剔除 route 模块 load 导出，避免打入浏览器 chunk。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  createStripLoadPlugin,
  stripLoadExport,
} from "../../src/feature/strip-load-plugin.ts";

describe("strip-load-plugin (stripLoadExport)", () => {
  it("应移除 export async function load(...) { ... }", () => {
    const src = `
import { db } from "./db.ts";
export async function load(ctx: unknown) {
  return { a: 1 };
}
export default function Page() { return null; }
`;
    const out = stripLoadExport(src);
    expect(out).not.toContain("export async function load");
    expect(out).toContain("export default function Page");
    expect(out).toContain('import { db }');
  });

  it("应移除带泛型的 export function load<T>(...)", () => {
    const src = `
export function load<T extends object>(ctx: T) {
  return {};
}
export const x = 1;
`;
    const out = stripLoadExport(src);
    expect(out).not.toMatch(/export\s+function\s+load/);
    expect(out).toContain("export const x = 1");
  });

  it("应移除 export const load = async () => { ... }", () => {
    const src = `
export const load = async () => {
  return { ok: true };
};
export function Page() {}
`;
    const out = stripLoadExport(src);
    expect(out).not.toContain("export const load");
    expect(out).toContain("export function Page");
  });

  it("应移除 export const load = () => expr 箭头表达式", () => {
    const src = `export const load = () => ({ data: 1 });\nexport default 1;\n`;
    const out = stripLoadExport(src);
    expect(out).not.toContain("export const load");
    expect(out).toContain("export default 1");
  });

  it("无 load 导出时应原样返回", () => {
    const src = `export default function Page() { return 1; }\n`;
    expect(stripLoadExport(src)).toBe(src);
  });

  it("createStripLoadPlugin 应返回命名插件", () => {
    const p = createStripLoadPlugin("/abs/src/routes");
    expect(p.name).toBe("dweb-strip-load");
    expect(typeof p.setup).toBe("function");
  });
});

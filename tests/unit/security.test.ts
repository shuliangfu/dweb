/**
 * 安全输出工具测试。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  createDefaultErrorHtml,
  escapeHtml,
  serializeJsonForInlineScript,
} from "../../src/utils/security.ts";

describe("安全输出工具 (security.ts)", () => {
  it("escapeHtml 应转义 HTML 特殊字符", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("escapeHtml 无特殊字符时应返回同一字符串引用", () => {
    const s = "hello world 123";
    expect(escapeHtml(s)).toBe(s);
  });

  it("serializeJsonForInlineScript 应避免 script 上下文逃逸", () => {
    const json = serializeJsonForInlineScript({
      text: "</script><img onerror=alert(1)>",
      line: "\u2028\u2029",
    });

    expect(json).not.toContain("</script>");
    expect(json).toContain("\\u003C/script\\u003E");
    expect(json).toContain("\\u2028");
    expect(json).toContain("\\u2029");
    expect(JSON.parse(json).text).toBe("</script><img onerror=alert(1)>");
  });

  it("serializeJsonForInlineScript 对安全 JSON 应保持可解析且语义不变", () => {
    const payload = { a: 1, b: "ok", c: true };
    const json = serializeJsonForInlineScript(payload);
    expect(JSON.parse(json)).toEqual(payload);
  });

  it("createDefaultErrorHtml 应在不同环境下保持错误页安全", () => {
    const html = createDefaultErrorHtml(new Error("<script>alert(1)</script>"));
    // dev 环境展示转义后的错误摘要，生产环境展示固定文案；两者都不能输出原始脚本。
    const hasSafeMessage = html.includes(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    ) || html.includes("An unexpected error occurred.");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(hasSafeMessage).toBe(true);
  });
});

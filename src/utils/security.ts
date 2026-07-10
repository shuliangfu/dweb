/**
 * @fileoverview dweb 安全输出工具。
 * 集中处理 HTML 与内联脚本上下文中的转义，避免各渲染模式出现策略分歧。
 */

import { getEnv } from "../core/runtime-adapter.ts";

/**
 * 将文本转义为 HTML 文本节点安全内容。
 *
 * @param value 待输出到 HTML 的值
 */
export function escapeHtml(value: unknown): string {
  const s = String(value);
  // 热路径：无特殊字符时零分配返回（错误页/meta 常见纯 ASCII）
  if (
    s.indexOf("&") === -1 && s.indexOf("<") === -1 && s.indexOf(">") === -1 &&
    s.indexOf('"') === -1 && s.indexOf("'") === -1
  ) {
    return s;
  }
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 安全序列化要插入 `<script>` 的 JSON。
 *
 * JSON.stringify 不会默认转义 `<` 和 U+2028/U+2029；若数据中包含
 * `</script>` 会提前闭合脚本标签。本函数保持 JSON 语义不变，同时避免 HTML
 * 脚本上下文逃逸。
 *
 * @param value 要序列化的值
 */
export function serializeJsonForInlineScript(value: unknown): string {
  const raw = JSON.stringify(value);
  // 常见 load() 数据无 <>&/LS 分隔符：跳过五次全局 replace
  if (
    raw.indexOf("<") === -1 && raw.indexOf(">") === -1 &&
    raw.indexOf("&") === -1 && raw.indexOf("\u2028") === -1 &&
    raw.indexOf("\u2029") === -1
  ) {
    return raw;
  }
  return raw
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * 生成默认 500 HTML。开发环境展示转义后的错误摘要；生产环境只给固定文案。
 *
 * @param error 捕获到的异常
 */
export function createDefaultErrorHtml(error: unknown): string {
  const isDev = getEnv("RUNTIME_ENV") === "dev";
  const message = isDev
    ? error instanceof Error ? error.message : String(error)
    : "An unexpected error occurred.";
  return `<!DOCTYPE html><html><head><title>500 Error</title></head><body><h1>Internal Server Error</h1><p>${
    escapeHtml(message)
  }</p></body></html>`;
}

/**
 * 生成 load-data 等 JSON 接口的错误体。生产环境不暴露内部错误细节。
 *
 * @param errorCode 公开错误码
 * @param error 捕获到的异常
 */
export function createJsonErrorBody(
  errorCode: string,
  error: unknown,
): Record<string, string> {
  const isDev = getEnv("RUNTIME_ENV") === "dev";
  return {
    error: errorCode,
    message: isDev
      ? error instanceof Error ? error.message : String(error)
      : "Internal Server Error",
  };
}

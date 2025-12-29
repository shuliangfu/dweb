/**
 * 代码高亮工具（已简化）
 * 为了减少 JS 体积，移除了 Shiki 依赖，仅保留基本的 HTML 转义功能
 */

/**
 * 初始化 Shiki 高亮器 (空实现)
 * 保持接口兼容性，但不再加载 Shiki
 */
export async function initShiki() {
  // 不做任何事
  return Promise.resolve();
}

/**
 * 高亮代码 (仅转义)
 * @param code 代码内容
 * @param lang 语言
 * @returns 转义后的 HTML，包裹在 pre code 标签中
 */
export function highlight(code: string, lang: string = "text"): string {
  // 直接返回原始内容（经过转义）
  return `<pre class="shiki"><code class="language-${lang}">${
    escapeHtml(code)
  }</code></pre>`;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

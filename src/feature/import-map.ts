/**
 * 客户端 Import Map 工具
 *
 * 当 Preact/React 被标为 external 时，chunk 不打包框架代码，
 * 需在 HTML 中注入 import map，让浏览器从 CDN 加载并共享同一实例，
 * 避免 HMR 无感刷新时多实例导致的 _H 报错。
 */

/** Preact 默认版本（与示例 deno.json 一致） */
const PREACT_VERSION = "10.28.0";

/** esm.sh CDN 基础 URL */
const ESM_SH_BASE = "https://esm.sh";

/**
 * 根据渲染引擎返回客户端 import map 的 script 标签 HTML
 *
 * 必须在 <script type="module"> 之前注入，浏览器才能正确解析 bare specifier。
 *
 * @param engine 渲染引擎（preact | react）
 * @returns import map 的 script 标签 HTML，无匹配引擎时返回空字符串
 */
export function getClientImportMapScript(
  engine: "react" | "preact",
): string {
  if (engine === "preact") {
    const imports = {
      preact: `${ESM_SH_BASE}/preact@${PREACT_VERSION}`,
      "preact/hooks": `${ESM_SH_BASE}/preact@${PREACT_VERSION}/hooks`,
      "preact/jsx-runtime": `${ESM_SH_BASE}/preact@${PREACT_VERSION}/jsx-runtime`,
    };
    return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
  }
  // React 暂不处理，后续可扩展
  return "";
}

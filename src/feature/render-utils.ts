/**
 * 渲染相关工具函数（CSR/Hybrid 等共用）
 */

/**
 * 检测 HTML 字符串中是否包含挂载容器元素（某标签的 id 等于 containerId）
 * 仅匹配开始标签（<tag ...>）内的 id 属性，避免误判 script 等文本中的 id="app"。
 *
 * @param html 完整 HTML 字符串（SSR 输出）
 * @param containerId 挂载容器 ID，如 "app"
 * @returns 若存在形如 \<div id="app"\> 的节点则返回 true
 */
export function hasContainerElementInHtml(
  html: string,
  containerId: string,
): boolean {
  const escaped = containerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 匹配 <tag ... id="containerId" ...>，[^>]* 限定在标签属性区域内，避免匹配到 script 正文
  const re = new RegExp(`<[a-zA-Z][^>]*\\bid=["']${escaped}["']`);
  return re.test(html);
}

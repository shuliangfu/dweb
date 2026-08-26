/**
 * 渲染相关工具函数（CSR/Hybrid/SSR/SSG 共用）
 */

import type { Router } from "@dreamer/router";
import { extractComponentPathFromRouteFile } from "../utils/path.ts";

/**
 * 收集供客户端使用的路由列表（component 与 ROUTE_LOADERS key 统一格式）
 *
 * @param router 路由实例
 * @param routesDirPath routes 目录绝对路径（用于 extractComponentPathFromRouteFile）
 * @returns 客户端路由数组
 */
export function collectClientRoutes(
  router: Router,
  routesDirPath: string,
): Array<{ path: string; component: string; type: string }> {
  const routes: Array<{ path: string; component: string; type: string }> = [];
  const allRoutes = (router.getRoutes?.() || []) as Array<{
    path: string;
    file?: string;
    isApi?: boolean;
    type?: string;
  }>;
  for (const route of allRoutes) {
    if (route.isApi) continue;
    const raw = route.file || route.path || "";
    const component = extractComponentPathFromRouteFile(routesDirPath, raw) ||
      raw.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "").trim();
    routes.push({
      path: route.path,
      component,
      type: route.type || "static",
    });
  }
  return routes;
}

/**
 * 转义 style 内容中的 `</`，避免提前闭合 style 标签
 */
export function escapeHtmlInStyle(css: string): string {
  return css.replace(/<\//g, "\\3C /");
}

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

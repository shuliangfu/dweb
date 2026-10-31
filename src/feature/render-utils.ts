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

/** 流结束时仍没有挂载容器。调用方应在返回 Response 之前抛出。 */
export class MountContainerMissingError extends Error {
  readonly htmlLength: number;

  constructor(containerId: string, htmlLength: number) {
    super(`mount container not found: ${containerId}`);
    this.name = "MountContainerMissingError";
    this.htmlLength = htmlLength;
  }
}

/**
 * 读流直到 HTML 里出现挂载容器，再把已读字节和后续字节合成一条流。
 * 容器标签可以被切在两个 chunk 里。流结束仍没有容器时抛 MountContainerMissingError，
 * 此时响应还没发出。
 */
export async function streamAfterMountContainer(
  body: ReadableStream<Uint8Array>,
  containerId: string,
): Promise<ReadableStream<Uint8Array>> {
  const reader = body.getReader();
  const buffered: Uint8Array[] = [];
  const decoder = new TextDecoder();
  let html = "";
  let found = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      buffered.push(value.slice());
      html += decoder.decode(value, { stream: true });
      if (hasContainerElementInHtml(html, containerId)) {
        found = true;
        break;
      }
    }
    if (!found) {
      html += decoder.decode();
      found = hasContainerElementInHtml(html, containerId);
    }
  } catch (err) {
    await reader.cancel(err).catch(() => undefined);
    throw err;
  }
  if (!found) {
    await reader.cancel().catch(() => undefined);
    throw new MountContainerMissingError(containerId, html.length);
  }

  let offset = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (offset < buffered.length) {
        const chunk = buffered[offset]!;
        offset++;
        if (chunk.byteLength > 0) {
          controller.enqueue(chunk);
          return;
        }
      }
      while (true) {
        const next = await reader.read();
        if (next.done) {
          controller.close();
          return;
        }
        if (next.value && next.value.byteLength > 0) {
          controller.enqueue(next.value);
          return;
        }
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

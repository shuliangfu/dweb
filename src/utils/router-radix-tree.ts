import type { RouteInfo } from "../core/router.ts";

/**
 * Radix Tree 节点接口
 */
export interface RadixNode {
  /** 路径片段（例如 "users" 或 ":id"） */
  part: string;
  /** 子节点映射（静态路径） */
  children: Map<string, RadixNode>;
  /** 路由信息（如果是叶子节点） */
  routeInfo: RouteInfo | null;
  /** 通配符子节点（参数路由 :id） */
  wildcardChild: RadixNode | null;
  /** 捕获所有子节点（...slug 或 *） */
  catchAllChild: RadixNode | null;
  /** 参数名称（如果当前节点是参数节点） */
  paramName: string | null;
}

/**
 * 路由 Radix Tree 实现
 * 用于高性能路由匹配，复杂度仅与 URL 长度相关，与路由数量无关
 */
export class RadixTree {
  private root: RadixNode;

  constructor() {
    this.root = this.createNode("");
  }

  private createNode(part: string): RadixNode {
    return {
      part,
      children: new Map(),
      routeInfo: null,
      wildcardChild: null,
      catchAllChild: null,
      paramName: null,
    };
  }

  /**
   * 插入路由
   * @param path 路由路径
   * @param routeInfo 路由信息
   */
  insert(path: string, routeInfo: RouteInfo): void {
    const parts = path.split("/").filter(Boolean);
    let currentNode = this.root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // 处理捕获所有路由（...slug 或 *）
      // 注意：Catch-all 必须是路径的最后一部分
      if (
        part === "*" || (part.startsWith(":") && part.endsWith("*")) ||
        part.startsWith("[...") ||
        (routeInfo.isCatchAll && i === parts.length - 1)
      ) {
        if (!currentNode.catchAllChild) {
          currentNode.catchAllChild = this.createNode("*");
          // 提取参数名
          if (part.startsWith("[...")) {
            currentNode.catchAllChild.paramName = part.slice(4, -1);
          } else {
            // 尝试从 routeInfo.params 获取
            currentNode.catchAllChild.paramName = routeInfo.params
              ? routeInfo.params[routeInfo.params.length - 1]
              : "slug";
          }
        }
        currentNode = currentNode.catchAllChild;
        // Catch-all 节点匹配剩余所有路径，所以它是最后一个节点
        break;
      }

      // 处理参数路由（:id 或 [id]）
      if (
        part.startsWith(":") || (part.startsWith("[") && part.endsWith("]"))
      ) {
        if (!currentNode.wildcardChild) {
          currentNode.wildcardChild = this.createNode(":");
          currentNode.wildcardChild.paramName = part.startsWith(":")
            ? part.slice(1)
            : part.slice(1, -1);
        }
        currentNode = currentNode.wildcardChild;
        continue;
      }

      // 处理静态路由
      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, this.createNode(part));
      }
      currentNode = currentNode.children.get(part)!;
    }

    // 标记为结束节点并存储路由信息
    currentNode.routeInfo = routeInfo;
  }

  /**
   * 匹配路由
   * @param path URL 路径
   * @returns 匹配的路由信息
   */
  match(path: string): RouteInfo | null {
    const parts = path.split("/").filter(Boolean);
    return this.matchRecursive(this.root, parts, 0);
  }

  private matchRecursive(
    node: RadixNode,
    parts: string[],
    index: number,
  ): RouteInfo | null {
    // 匹配结束，检查当前节点是否有路由信息
    if (index === parts.length) {
      // 优先匹配当前节点的路由信息
      if (node.routeInfo) {
        return node.routeInfo;
      }
      // 如果没有完全匹配，但有 catch-all，也算匹配（例如 /docs 匹配 /docs/[...slug]）
      if (node.catchAllChild && node.catchAllChild.routeInfo) {
        return node.catchAllChild.routeInfo;
      }
      return null;
    }

    const part = parts[index];

    // 1. 优先尝试静态匹配
    const child = node.children.get(part);
    if (child) {
      const result = this.matchRecursive(child, parts, index + 1);
      if (result) return result;
    }

    // 2. 尝试参数匹配 (:id)
    if (node.wildcardChild) {
      const result = this.matchRecursive(node.wildcardChild, parts, index + 1);
      if (result) return result;
    }

    // 3. 尝试捕获所有匹配 (* 或 ...slug)
    if (node.catchAllChild) {
      // Catch-all 匹配剩余所有部分，直接返回其路由信息
      return node.catchAllChild.routeInfo;
    }

    return null;
  }
}

/**
 * 脚本服务工具
 * 用于存储和提供动态生成的脚本文件
 */

// 内存存储脚本内容（key: 脚本路径, value: 脚本内容）
const scriptStore = new Map<string, string>();

/**
 * 注册脚本到内存存储
 * @param scriptPath 脚本路径（如 /__scripts/i18n.js）
 * @param scriptContent 脚本内容
 */
export function registerScript(
  scriptPath: string,
  scriptContent: string,
): void {
  scriptStore.set(scriptPath, scriptContent);
}

/**
 * 获取脚本内容
 * @param scriptPath 脚本路径
 * @returns 脚本内容，如果不存在返回 null
 */
export function getScript(scriptPath: string): string | null {
  return scriptStore.get(scriptPath) || null;
}

/**
 * 生成唯一的脚本路径
 * @param prefix 路径前缀（如 "i18n", "store", "theme", "client", "hmr"）
 * @returns 唯一的脚本路径
 */
export function generateScriptPath(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `/__scripts/${prefix}-${timestamp}-${random}.js`;
}

/**
 * 创建脚本服务中间件
 * 处理 /__scripts/ 路径的请求
 */
import type { Middleware } from "../../common/types/index.ts";

export function createScriptServerMiddleware(): Middleware {
  return async (req, res, next) => {
    const url = new URL(req.url);

    // 只处理 /__scripts/ 路径
    if (!url.pathname.startsWith("/__scripts/")) {
      await next();
      return;
    }

    // 获取脚本内容
    const scriptContent = getScript(url.pathname);

    if (!scriptContent) {
      res.status = 404;
      res.body = "Script not found";
      return;
    }

    // 设置响应头
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status = 200;
    res.body = scriptContent;
  };
}

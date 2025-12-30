/**
 * 热更新模块（HMR）
 * 监听文件变化并自动重载
 */

import { buildFromEntryPoints } from "../server/utils/esbuild.ts";
import * as path from "@std/path";
import { cleanUrl, getRelativePath } from "../common/utils/path.ts";
import { shouldIgnoreFile } from "../server/utils/file.ts";
// HMR 客户端脚本生成函数已迁移到 src/utils/script-hmr.ts
export { createHMRClientScript } from "../client/utils/script-hmr.ts";

// ==================== 常量定义 ====================

/** 默认 HMR 服务器端口 */
const DEFAULT_HMR_PORT = 24678;

/** 默认服务器 origin */
const DEFAULT_SERVER_ORIGIN = "http://127.0.0.1:3000";

/** 需要忽略的文件模式 */
const IGNORED_FILE_PATTERNS = [
  (name: string) => name.startsWith("."),
  (name: string) => name.endsWith(".tmp"),
  (name: string) => name.endsWith("~"),
  (path: string) => path.includes("node_modules"),
  (path: string) => path.includes(".deno"),
  (path: string) => path.includes(".git"),
  (path: string) => path.includes(".DS_Store"),
  (path: string) => path.includes(".idea"),
  (path: string) => path.includes(".vscode"),
  (path: string) => path.includes(".npm"),
  (path: string) => path.includes(".deno"),
  (path: string) => path.includes(".git"),
  (path: string) => path.includes(".lock"),
  (path: string) => path.includes(".log"),
  (path: string) => path.includes(".env"),
  (path: string) => path.includes("runtime"),
  (path: string) => path.includes(".runtime"),
  (path: string) => path.includes("coverage"),
  (path: string) => path.includes("build"),
  (path: string) => path.includes("dist"),
];

// ==================== 类型定义 ====================

/**
 * 文件变化信息
 */
export interface FileChangeInfo {
  path: string;
  kind: "modify" | "create" | "remove";
  relativePath?: string;
}

/**
 * 文件类型
 */
type FileType = "css" | "component" | "other";

// ==================== 工具函数 ====================

// ==================== FileWatcher 类 ====================

/**
 * 文件变化监听器
 * 负责监听文件系统变化并触发回调
 */
export class FileWatcher {
  private watchers: Map<string, Deno.FsWatcher> = new Map();
  private callbacks: Set<(info: FileChangeInfo) => void | Promise<void>> =
    new Set();
  private reloadTimer?: number;
  private reloadDelay: number;
  private routesDir: string;

  constructor(reloadDelay: number = 300, routesDir: string = "routes") {
    this.reloadDelay = reloadDelay;
    this.routesDir = routesDir;
  }

  /**
   * 防抖重载
   */
  private debouncedReload(
    filePath: string,
    kind: "modify" | "create" | "remove",
  ): void {
    // 清除之前的定时器
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }

    // 设置新的定时器
    this.reloadTimer = setTimeout(async () => {
      const relativePath = getRelativePath(filePath);

      const changeInfo: FileChangeInfo = {
        path: filePath,
        kind,
        relativePath,
      };

      for (const callback of this.callbacks) {
        try {
          await callback(changeInfo);
        } catch (_error) {
          // 静默处理错误
        }
      }
    }, this.reloadDelay) as unknown as number;
  }

  /**
   * 监听目录
   * @param path 目录路径
   */
  watch(path: string): void {
    try {
      const watcher = Deno.watchFs(path);
      this.watchers.set(path, watcher);

      // 异步处理文件变化事件
      (async () => {
        for await (const event of watcher) {
          // 过滤掉不相关的事件
          if (
            event.kind === "modify" || event.kind === "create" ||
            event.kind === "remove"
          ) {
            // 处理每个变化的文件
            for (const filePath of event.paths) {
              if (!shouldIgnoreFile(filePath, IGNORED_FILE_PATTERNS)) {
                this.debouncedReload(filePath, event.kind);
              }
            }
          }
        }
      })().catch((_error) => {
        // 静默处理错误
      });
    } catch (_error) {
      // 静默处理错误
    }
  }

  /**
   * 添加文件变化回调
   * @param callback 回调函数，接收文件变化信息
   */
  onReload(callback: (info: FileChangeInfo) => void | Promise<void>): void {
    this.callbacks.add(callback);
  }

  /**
   * 移除文件变化回调
   * @param callback 回调函数
   */
  offReload(callback: (info: FileChangeInfo) => void | Promise<void>): void {
    this.callbacks.delete(callback);
  }

  /**
   * 停止监听
   */
  stop(): void {
    for (const [path, watcher] of this.watchers.entries()) {
      watcher.close();
      this.watchers.delete(path);
    }
    this.callbacks.clear();
  }
}

// ==================== HMRServer 类 ====================

/**
 * WebSocket HMR 服务器
 * 负责：
 * 1. 管理 WebSocket 连接
 * 2. 编译组件文件
 * 3. 处理文件变化通知
 * 4. 向前端推送更新
 */
export class HMRServer {
  private connections: Set<WebSocket> = new Set();
  // 组件编译缓存（改进 HMR 响应速度）
  private componentCache: Map<string, { code: string; mtime: number }> | null =
    null;
  private server?: Deno.HttpServer;
  private serverOrigin: string = DEFAULT_SERVER_ORIGIN;
  private routesDir: string = "routes"; // 路由目录（用于判断文件类型）

  /**
   * 设置服务器 origin（用于生成完整的 HTTP URL）
   */
  setServerOrigin(origin: string): void {
    this.serverOrigin = cleanUrl(origin);
  }

  /**
   * 设置路由目录（用于判断文件类型）
   */
  setRoutesDir(routesDir: string): void {
    this.routesDir = routesDir;
  }

  // ==================== 路径处理 ====================

  /**
   * 将相对路径转换为 /__modules/ 路径
   * @param relativePath 当前文件的相对路径（如 'example/routes/about.tsx'）
   * @param importPath 导入的相对路径（如 '../components/TechCard.tsx'）
   * @returns /__modules/ 格式的路径（如 '/__modules/example%2Fcomponents%2FTechCard.tsx'）
   */
  private resolveModulePath(relativePath: string, importPath: string): string {
    const currentDir = relativePath.substring(0, relativePath.lastIndexOf("/"));
    const parts = currentDir.split("/").filter(Boolean);
    const importParts = importPath.split("/").filter(Boolean);

    // 处理 .. 和 . 路径
    for (const part of importParts) {
      if (part === "..") {
        if (parts.length > 0) parts.pop();
      } else if (part !== ".") {
        parts.push(part);
      }
    }

    const absolutePath = parts.join("/");
    return `/__modules/${encodeURIComponent(absolutePath)}`;
  }

  /**
   * 替换代码中的相对路径导入为 /__modules/ 路径
   */
  private replaceRelativeImports(jsCode: string, relativePath: string): string {
    const replaceImport = (
      match: string,
      importPath: string,
      quote: string,
    ) => {
      const modulePath = this.resolveModulePath(relativePath, importPath);
      return match.replace(importPath + quote, modulePath + quote);
    };

    // 替换 import ... from '相对路径'
    jsCode = jsCode.replace(/from\s+['"](\.\.?\/[^'"]+)(['"])/g, replaceImport);

    // 替换 import('相对路径') 动态导入
    jsCode = jsCode.replace(
      /import\s*\(\s*['"](\.\.?\/[^'"]+)(['"])/g,
      replaceImport,
    );

    // 替换 import type ... from '相对路径'（TypeScript 类型导入）
    jsCode = jsCode.replace(
      /import\s+type\s+[^'"]+\s+from\s+['"](\.\.?\/[^'"]+)(['"])/g,
      replaceImport,
    );

    return jsCode;
  }

  /**
   * 将 /__modules/ 路径转换为完整的 HTTP URL
   */
  private convertModulePathsToHttpUrls(
    jsCode: string,
    relativePath: string,
  ): string {
    const origin = cleanUrl(this.serverOrigin);

    // 修复错误的模块路径格式（/modules/ 或 /_modules/ 或 / modules/）
    jsCode = jsCode.replace(
      /(['"])(https?:\/\/[^'"]*?)\/\s*([_ ]?modules\/[^'"]+)(['"])/g,
      (_match, quote1, urlOrigin, modulePath, quote2) => {
        let cleanPath = cleanUrl(modulePath);
        if (cleanPath.startsWith("modules/")) {
          cleanPath = "__modules/" + cleanPath.slice("modules/".length);
        } else if (cleanPath.startsWith("_modules/")) {
          cleanPath = "__modules/" + cleanPath.slice("_modules/".length);
        } else if (!cleanPath.startsWith("__modules/")) {
          cleanPath = "__modules/" + cleanPath;
        }
        return `${quote1}${urlOrigin}/${cleanPath}${quote2}`;
      },
    );

    // 替换 /__modules/ 路径为完整的 HTTP URL
    jsCode = jsCode.replace(
      /(['"])(\/__modules\/[^'"]+)(['"])/g,
      (_match, quote1, modulePath, quote2) => {
        return `${quote1}${origin}${cleanUrl(modulePath)}${quote2}`;
      },
    );

    // 处理遗漏的相对路径导入（双重检查）
    const replaceRelative = (
      match: string,
      importPath: string,
      quote: string,
    ) => {
      const modulePath = this.resolveModulePath(relativePath, importPath);
      const fullUrl = `${origin}${cleanUrl(modulePath)}`;
      return match.replace(importPath + quote, fullUrl + quote);
    };

    jsCode = jsCode.replace(
      /from\s+['"](\.\.?\/[^'"]+)(['"])/g,
      replaceRelative,
    );
    jsCode = jsCode.replace(
      /import\s*\(\s*['"](\.\.?\/[^'"]+)(['"])/g,
      replaceRelative,
    );
    jsCode = jsCode.replace(
      /import\s+type\s+[^'"]+\s+from\s+['"](\.\.?\/[^'"]+)(['"])/g,
      replaceRelative,
    );

    return jsCode;
  }

  // ==================== 代码转换 ====================

  /**
   * 读取 import map 配置
   */
  private async loadImportMap(): Promise<Record<string, string>> {
    const { readDenoJson } = await import("../server/utils/file.ts");
    const possiblePaths = [Deno.cwd(), ".", "./"];

    for (const basePath of possiblePaths) {
      try {
        const config = await readDenoJson(basePath);
        if (config && config.imports) {
          return config.imports;
        }
      } catch {
        // 继续尝试下一个路径
      }
    }

    // 默认的 import map（使用固定版本，与 import-map.ts 保持一致，避免 Preact 实例冲突）
    return {
      "preact": "https://esm.sh/preact@10.28.0",
      "preact/jsx-runtime": "https://esm.sh/preact@10.28.0/jsx-runtime",
      "preact/hooks": "https://esm.sh/preact@10.28.0/hooks",
    };
  }

  /**
   * 检查模块名是否为外部模块（需要转换）
   */
  private isExternalModule(moduleName: string): boolean {
    return (
      !moduleName.startsWith("http://") &&
      !moduleName.startsWith("https://") &&
      !moduleName.startsWith("/__modules/") &&
      !moduleName.startsWith("./") &&
      !moduleName.startsWith("../")
    );
  }

  /**
   * 将外部模块导入（如 'preact'）转换为 HTTP URL
   */
  private async convertExternalImportsToHttpUrls(
    jsCode: string,
  ): Promise<string> {
    const importMap = await this.loadImportMap();

    // 替换外部模块导入为 HTTP URL
    const replaceExternalImport = (match: string, moduleName: string) => {
      if (!this.isExternalModule(moduleName)) {
        return match;
      }

      const moduleUrl = importMap[moduleName];
      return moduleUrl ? match.replace(moduleName, moduleUrl) : match;
    };

    // 处理 import ... from 'preact' 格式
    jsCode = jsCode.replace(/from\s+['"]([^'"]+)['"]/g, replaceExternalImport);

    // 处理动态导入 import('preact')
    jsCode = jsCode.replace(
      /import\s*\(\s*['"]([^'"]+)['"]/g,
      replaceExternalImport,
    );

    return jsCode;
  }

  /**
   * 使用 esbuild 打包 TypeScript/TSX 代码（包含所有依赖）
   * 与构建系统保持一致，将所有相对路径导入打包到一个文件
   */
  private async transformWithEsbuild(
    _fileContent: string,
    filePath: string,
    _moduleHttpUrl: string,
  ): Promise<string> {
    const cwd = Deno.cwd();
    const absoluteFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(cwd, filePath);

    // 读取 deno.json 或 deno.jsonc 获取 import map（用于解析外部依赖）
    let importMap: Record<string, string> = {};
    try {
      const { readDenoJson } = await import("../server/utils/file.ts");
      const denoJson = await readDenoJson(cwd);
      if (denoJson && denoJson.imports) {
        importMap = denoJson.imports;
      } else {
        // 如果读取失败，使用默认 import map
        importMap = await this.loadImportMap();
      }
    } catch {
      // deno.json 或 deno.jsonc 不存在或解析失败，使用默认 import map
      importMap = await this.loadImportMap();
    }

    // 外部依赖由 buildFromEntryPoints 自动处理

    // 使用统一的构建函数
    const result = await buildFromEntryPoints([absoluteFilePath], {
      importMap,
      cwd,
      bundleClient: true,
      minify: false, // 开发环境不压缩，便于调试
      sourcemap: false, // HMR 不需要 sourcemap，可以加快编译
    });

    if (!result.outputFiles || result.outputFiles.length === 0) {
      throw new Error("esbuild 打包结果为空");
    }

    // 返回编译后的代码
    return result.outputFiles[0].text;
  }

  /**
   * 编译组件文件为浏览器可用的 JavaScript
   */
  private async compileComponent(filePath: string): Promise<string | null> {
    try {
      await Deno.stat(filePath);

      if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts")) {
        return null;
      }

      // 优化：使用缓存避免重复编译（改进 HMR 响应速度）
      const cacheKey = `hmr:${filePath}`;
      const cached = this.componentCache?.get(cacheKey);
      if (cached) {
        // 检查文件修改时间，如果未变化则使用缓存
        try {
          const stat = await Deno.stat(filePath);
          if (cached.mtime === stat.mtime?.getTime()) {
            return cached.code;
          }
        } catch {
          // 文件不存在或无法读取，继续编译
        }
      }

      const fileContent = await Deno.readTextFile(filePath);
      const relativePath = getRelativePath(filePath);
      const origin = cleanUrl(this.serverOrigin);
      const moduleHttpUrl = `${origin}/__modules/${
        encodeURIComponent(cleanUrl(relativePath))
      }`;

      // 编译和转换流程
      // 使用 bundle: true 后，相对路径导入已被自动打包，只需要转换外部依赖
      let jsCode = await this.transformWithEsbuild(
        fileContent,
        filePath,
        moduleHttpUrl,
      );
      // 转换外部依赖为 HTTP URL（相对路径导入已被打包，不需要处理）
      jsCode = await this.convertExternalImportsToHttpUrls(jsCode);

      // 缓存编译结果（改进 HMR 响应速度）
      if (this.componentCache) {
        try {
          const stat = await Deno.stat(filePath);
          this.componentCache.set(cacheKey, {
            code: jsCode,
            mtime: stat.mtime?.getTime() || Date.now(),
          });
        } catch {
          // 无法获取文件信息，不缓存
        }
      }

      return jsCode;
    } catch {
      return null;
    }
  }

  /**
   * 设置 WebSocket 连接的事件处理器
   */
  private setupWebSocketHandlers(socket: WebSocket): void {
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "connected" }));
    };

    socket.onclose = () => {
      this.connections.delete(socket);
    };

    socket.onerror = (_error) => {
      this.connections.delete(socket);
    };
  }

  // ==================== WebSocket 管理 ====================

  /**
   * 启动 HMR WebSocket 服务器
   */
  start(port: number = DEFAULT_HMR_PORT, enableCache: boolean = true): void {
    // 启用组件编译缓存（改进 HMR 响应速度）
    if (enableCache) {
      this.componentCache = new Map();
      // 定期清理缓存（每 10 分钟清理一次，避免内存泄漏）
      setInterval(() => {
        if (this.componentCache && this.componentCache.size > 100) {
          // 如果缓存超过 100 项，清理最旧的 50%
          const entries = Array.from(this.componentCache.entries());
          const toDelete = entries.slice(0, Math.floor(entries.length / 2));
          for (const [key] of toDelete) {
            this.componentCache.delete(key);
          }
        }
      }, 10 * 60 * 1000) as unknown as number;
    }
    const handler = (req: Request): Response => {
      // 处理 WebSocket 升级
      const upgrade = req.headers.get("upgrade");
      if (upgrade !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);
      this.connections.add(socket);
      this.setupWebSocketHandlers(socket);

      return response;
    };

    // 使用 onListen 回调来禁用默认的 "Listening on" 输出
    this.server = Deno.serve(
      {
        port,
        onListen: () => {},
      },
      handler,
    );
  }

  /**
   * 通知所有客户端更新
   * @param type 更新类型
   * @param data 更新数据（包含文件变化信息）
   */
  notify(type: "reload" | "update", data?: Record<string, unknown>): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    for (const socket of this.connections) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(message);
        } catch (_error) {
          this.connections.delete(socket);
        }
      }
    }
  }

  // ==================== 文件处理 ====================

  /**
   * 判断文件类型
   */
  private getFileType(filePath: string): FileType {
    if (filePath.endsWith(".css")) {
      return "css";
    }

    // 判断是否为路由或组件文件（支持多应用模式，如 backend/routes/、frontend/routes/ 等）
    // 路由目录可能是 'routes' 或 'backend/routes'、'frontend/routes' 等
    const normalizedRoutesDir = this.routesDir.replace(/\/$/, ""); // 移除末尾的 /
    const isRoute = (filePath.startsWith(`${normalizedRoutesDir}/`) ||
      filePath.startsWith("routes/")) &&
      (filePath.endsWith(".tsx") || filePath.endsWith(".ts"));
    // 组件目录识别：当 components/ 下的 .tsx/.ts 发生变化时，按组件更新处理，避免整页刷新
    const isComponent = (filePath.includes("/components/") ||
      filePath.startsWith("components/")) &&
      (filePath.endsWith(".tsx") || filePath.endsWith(".ts"));
    const isLayout = filePath.includes("_layout") || filePath.includes("_app");

    return isRoute || isComponent || isLayout ? "component" : "other";
  }

  /**
   * 处理组件文件更新（发送模块 URL，客户端通过 GET 请求获取）
   */
  private handleComponentUpdate(filePath: string, fullPath: string): void {
    try {
      const relativePath = getRelativePath(fullPath);
      const origin = cleanUrl(this.serverOrigin);
      const moduleUrl = `${origin}/__modules/${
        encodeURIComponent(cleanUrl(relativePath))
      }`;

      this.notify("update", {
        file: filePath,
        type: "component",
        action: "update-component",
        moduleUrl,
      });
    } catch {
      this.notifyComponentReload(filePath);
    }
  }

  /**
   * 通知组件重新加载（降级方案）
   */
  private notifyComponentReload(filePath: string): void {
    this.notify("update", {
      file: filePath,
      type: "component",
      action: "reload-component",
    });
  }

  // ==================== 文件变化处理 ====================

  /**
   * 通知文件变化（智能更新，支持编译组件并发送给客户端）
   */
  notifyFileChange(changeInfo: {
    path: string;
    kind: string;
    relativePath?: string;
  }): void {
    const filePath = changeInfo.relativePath || changeInfo.path;
    const fileType = this.getFileType(filePath);
    switch (fileType) {
      case "css":
        this.notify("update", {
          file: filePath,
          type: "css",
          action: "reload-stylesheet",
        });
        break;

      case "component":
        this.handleComponentUpdate(filePath, changeInfo.path);
        // CSS 已注入到 HTML 中，组件更新时会自动重新编译和注入，无需单独通知
        break;

      default:
        this.notify("reload", { file: filePath });
        break;
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    // 关闭所有连接
    for (const socket of this.connections) {
      socket.close();
    }
    this.connections.clear();

    // 关闭服务器
    if (this.server) {
      await this.server.shutdown();
      this.server = undefined;
    }
  }
}

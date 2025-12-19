/**
 * 路由系统模块
 * 实现文件系统路由，自动扫描 routes 目录
 */

import { walk } from '@std/fs/walk';
import { globToRegExp } from '@std/path/glob-to-regexp';
import * as path from '@std/path';
import { isValidIdentifier, sanitizeRouteParams } from '../utils/security.ts';

/**
 * 路由信息
 * 
 * 表示一个路由的完整信息，包括路径、文件路径、类型等。
 * 
 * @interface RouteInfo
 */
export interface RouteInfo {
  /** URL 路径，例如 `/users/:id` 或 `/about` */
  path: string;
  
  /** 文件路径（服务器端加载用），绝对路径或相对路径 */
  filePath: string;
  
  /** 路由类型：页面路由、API 路由、布局、中间件或错误页面 */
  type: 'page' | 'api' | 'layout' | 'middleware' | 'error';
  
  /** 动态参数名数组，例如 `['id']` 对于 `/users/:id` */
  params?: string[];
  
  /** 是否为捕获所有路由（`[...slug]` 格式） */
  isCatchAll?: boolean;
  
  /** 客户端模块路径（生产环境用，只包含文件名），例如 `routes_index.abc123.js` */
  clientModulePath?: string;
}

/**
 * 路由管理器
 * 
 * 负责扫描路由目录、匹配路由、提取参数等。
 * 
 * @example
 * ```typescript
 * import { Router } from "@dreamer/dweb";
 * 
 * const router = new Router("routes", ["**/*.test.ts"]);
 * await router.scan();
 * 
 * const route = router.match("/users/123");
 * if (route) {
 *   console.log("匹配的路由:", route.path);
 * }
 * ```
 */
export class Router {
  private routes: Map<string, RouteInfo> = new Map();
  private layouts: Map<string, string> = new Map();  // 路径 -> layout 文件路径
  private middlewares: Map<string, string> = new Map();  // 路径 -> middleware 文件路径
  private errorPages: Map<string, string> = new Map();  // 错误类型 -> 文件路径
  private appFilePath: string | null = null;  // _app.tsx 文件路径
  private routesDir: string;
  private ignorePatterns: RegExp[] = [];
  private basePath: string = '/';  // 应用基础路径（多应用模式使用）
  
  constructor(routesDir: string, ignore?: string[], basePath?: string) {
    this.routesDir = routesDir;
    this.basePath = basePath || '/';
    
    // 确保 basePath 以 / 开头，以 / 结尾（除非是根路径）
    if (this.basePath !== '/') {
      if (!this.basePath.startsWith('/')) {
        this.basePath = '/' + this.basePath;
      }
      if (!this.basePath.endsWith('/')) {
        this.basePath = this.basePath + '/';
      }
    }
    
    // 编译忽略模式
    if (ignore) {
      this.ignorePatterns = ignore.map(pattern => globToRegExp(pattern));
    }
  }
  
  /**
   * 从构建映射文件加载路由（生产环境）
   * 
   * 在生产环境中，从构建系统生成的路由映射文件加载路由信息。
   * 这样可以避免在生产环境中扫描文件系统，提升性能。
   * 
   * @param routeMapPath - 路由映射文件路径（.route-map.json）
   * @param outDir - 构建输出目录
   * 
   * @example
   * ```typescript
   * const router = new Router("routes");
   * await router.loadFromBuildMap("dist/.route-map.json", "dist");
   * ```
   */
  async loadFromBuildMap(routeMapPath: string, outDir: string): Promise<void> {
    this.routes.clear();
    this.layouts.clear();
    this.middlewares.clear();
    this.errorPages.clear();
    this.appFilePath = null;

    try {
      // 读取路由映射文件
      const routeMapContent = await Deno.readTextFile(routeMapPath);
      const routeMap: Record<string, string> = JSON.parse(routeMapContent);

      // 遍历路由映射，创建路由信息
      for (const [routeKey, hashFileName] of Object.entries(routeMap)) {
        // 构建文件的完整路径（用于服务器端加载）
        const buildFilePath = path.resolve(outDir, hashFileName);
        // 用于客户端请求的路径（只包含文件名，不包含 dist/ 前缀）
        const clientModulePath = hashFileName;
        
        // 规范化路由路径（路由映射中的 key 可能是 "index" 或 "/index"）
        let routePath = routeKey;
        if (!routePath.startsWith('/')) {
          // 如果路由 key 是 "index"，转换为 "/"
          if (routePath === 'index') {
            routePath = '/';
          } else {
            routePath = '/' + routePath;
          }
        }
        
        // 确定路由类型
        let type: 'page' | 'api' | 'layout' | 'middleware' | 'error' = 'page';
        if (routePath.startsWith('/api/')) {
          type = 'api';
        } else if (routePath === '/_layout' || routePath.endsWith('/_layout')) {
          type = 'layout';
        } else if (routePath === '/_404' || routePath === '/_error' || routePath === '/_500') {
          type = 'error';
        } else if (routePath === '/_app') {
          this.appFilePath = buildFilePath;
          continue;
        }

        // 加上 basePath 前缀（如果 basePath 不是根路径，且不是特殊文件）
        if (this.basePath !== '/' && type !== 'layout' && type !== 'error') {
          const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
          if (routePath === '/') {
            routePath = base;
          } else {
            routePath = base + routePath;
          }
        }

        // 创建路由信息
        // 注意：filePath 用于服务器端加载，需要完整路径
        // 但为了客户端请求，我们需要存储客户端模块路径
        const routeInfo: RouteInfo = {
          path: routePath,
          filePath: buildFilePath,
          type,
          // 存储客户端模块路径（用于生成 HTTP URL）
          clientModulePath: clientModulePath,
        } as RouteInfo & { clientModulePath?: string };

        // 处理动态路由参数（路由路径中可能包含 [param] 格式）
        const paramMatch = routePath.match(/\[([^\]]+)\]/g);
        if (paramMatch) {
          routeInfo.params = paramMatch.map(p => p.slice(1, -1));
        }

        // 检查是否为捕获所有路由
        if (routePath.includes('[...')) {
          routeInfo.isCatchAll = true;
        }

        // 添加到路由映射
        this.routes.set(routePath, routeInfo);

        // 处理特殊文件
        if (type === 'layout') {
          let layoutPath = routePath === '/_layout' ? '/' : routePath.replace('/_layout', '');
          // 如果 basePath 不是根路径，且 layoutPath 是根路径，使用 basePath
          if (this.basePath !== '/' && layoutPath === '/') {
            layoutPath = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
          }
          this.layouts.set(layoutPath, buildFilePath);
        } else if (type === 'error') {
          const errorType = routePath.replace('/_', '');
          this.errorPages.set(errorType, buildFilePath);
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`路由映射文件不存在: ${routeMapPath}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * 扫描路由目录
   * 
   * 扫描配置的路由目录，自动发现所有路由文件并构建路由映射。
   * 支持页面路由、API 路由、布局、中间件和错误页面。
   * 
   * @example
   * ```typescript
   * const router = new Router("routes", ["**/*.test.ts"]);
   * await router.scan();
   * 
   * // 获取所有路由
   * const routes = router.getAllRoutes();
   * console.log(`发现 ${routes.length} 个路由`);
   * ```
   */
  async scan(): Promise<void> {
    this.routes.clear();
    this.layouts.clear();
    this.middlewares.clear();
    this.errorPages.clear();
    this.appFilePath = null;
    
    try {
      // 遍历 routes 目录
      for await (const entry of walk(this.routesDir, {
        includeFiles: true,
        includeDirs: false,
        exts: ['.ts', '.tsx', '.js', '.jsx']
      })) {
        const filePath = entry.path;
        const relativePath = filePath.replace(this.routesDir + '/', '');
        
        // 检查是否应该忽略
        if (this.shouldIgnore(relativePath)) {
          continue;
        }
        
        // 处理不同类型的文件
        if (relativePath.startsWith('_')) {
          this.handleSpecialFile(relativePath, filePath);
        } else if (relativePath.startsWith('api/')) {
          this.handleApiRoute(relativePath, filePath);
        } else {
          this.handlePageRoute(relativePath, filePath);
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.warn(`路由目录不存在: ${this.routesDir}`);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * 检查文件是否应该被忽略
   */
  private shouldIgnore(filePath: string): boolean {
    return this.ignorePatterns.some(pattern => pattern.test(filePath));
  }
  
  /**
   * 处理特殊约定文件
   */
  private handleSpecialFile(relativePath: string, filePath: string): void {
    if (relativePath === '_app.tsx' || relativePath === '_app.ts') {
      // _app.tsx 是根应用组件，用于包裹所有页面
      this.appFilePath = filePath;
    } else if (relativePath === '_layout.tsx' || relativePath === '_layout.ts') {
      // 根布局：如果 basePath 不是根路径，使用 basePath；否则使用 '/'
      const layoutPath = this.basePath !== '/' 
        ? (this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath)
        : '/';
      this.layouts.set(layoutPath, filePath);
    } else if (relativePath.endsWith('/_layout.tsx') || relativePath.endsWith('/_layout.ts')) {
      let path = '/' + relativePath.replace(/\/_layout\.(tsx|ts)$/, '');
      // 加上 basePath 前缀（如果 basePath 不是根路径）
      if (this.basePath !== '/') {
        const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
        path = base + path;
      }
      this.layouts.set(path, filePath);
    } else if (relativePath === '_middleware.ts') {
      this.middlewares.set('/', filePath);
    } else if (relativePath.endsWith('/_middleware.ts')) {
      const path = '/' + relativePath.replace(/\/_middleware\.ts$/, '');
      this.middlewares.set(path, filePath);
    } else if (relativePath === '_404.tsx' || relativePath === '_404.ts') {
      this.errorPages.set('404', filePath);
    } else if (relativePath === '_error.tsx' || relativePath === '_error.ts') {
      this.errorPages.set('error', filePath);
    } else if (relativePath === '_500.tsx' || relativePath === '_500.ts') {
      this.errorPages.set('500', filePath);
    }
  }
  
  /**
   * 处理 API 路由
   */
  private handleApiRoute(relativePath: string, filePath: string): void {
    // 移除 api/ 前缀
    const apiPath = relativePath.replace(/^api\//, '');
    
    // 移除文件扩展名
    const pathWithoutExt = apiPath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // 处理动态路由
    const { path, params, isCatchAll } = this.parseDynamicPath(pathWithoutExt);
    
    // 加上 basePath 前缀（如果 basePath 不是根路径）
    let routePath = '/api' + path;
    if (this.basePath !== '/') {
      // 移除 basePath 末尾的 /，然后加上路由路径
      const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
      routePath = base + routePath;
    }
    
    this.routes.set(routePath, {
      path: routePath,
      filePath,
      type: 'api',
      params,
      isCatchAll
    });
  }
  
  /**
   * 处理页面路由
   */
  private handlePageRoute(relativePath: string, filePath: string): void {
    // 移除文件扩展名
    const pathWithoutExt = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // 处理 index 文件
    if (pathWithoutExt === 'index' || pathWithoutExt.endsWith('/index')) {
      const basePath = pathWithoutExt.replace(/\/?index$/, '') || '/';
      let path = basePath === '/' ? '/' : basePath;
      
      // 加上 basePath 前缀（如果 basePath 不是根路径）
      if (this.basePath !== '/') {
        const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
        if (path === '/') {
          path = base;
        } else {
          path = base + path;
        }
      }
      
      this.routes.set(path, {
        path,
        filePath,
        type: 'page'
      });
      return;
    }
    
    // 处理动态路由
    const { path, params, isCatchAll } = this.parseDynamicPath(pathWithoutExt);
    
    // 加上 basePath 前缀（如果 basePath 不是根路径）
    let routePath = path;
    if (this.basePath !== '/') {
      const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
      routePath = base + path;
    }
    
    this.routes.set(routePath, {
      path: routePath,
      filePath,
      type: 'page',
      params,
      isCatchAll
    });
  }
  
  /**
   * 解析动态路径
   * @param path 路径字符串
   * @returns 解析后的路径信息
   */
  private parseDynamicPath(path: string): {
    path: string;
    params?: string[];
    isCatchAll?: boolean;
  } {
    const parts = path.split('/');
    const params: string[] = [];
    let isCatchAll = false;
    
    const processedParts = parts.map(part => {
      // 处理 [param] 格式
      if (part.startsWith('[') && part.endsWith(']')) {
        const paramName = part.slice(1, -1);
        params.push(paramName);
        return ':' + paramName;
      }
      
      // 处理 [...slug] 格式
      if (part.startsWith('[...') && part.endsWith(']')) {
        const paramName = part.slice(4, -1);
        params.push(paramName);
        isCatchAll = true;
        return '*';
      }
      
      return part;
    });
    
    const processedPath = '/' + processedParts.join('/');
    
    return {
      path: processedPath === '//' ? '/' : processedPath,
      params: params.length > 0 ? params : undefined,
      isCatchAll
    };
  }
  
  /**
   * 匹配路由
   * @param urlPath URL 路径
   * @returns 匹配的路由信息
   */
  match(urlPath: string): RouteInfo | null {
    // 如果 basePath 不是根路径，检查 urlPath 是否以 basePath 开头
    if (this.basePath !== '/') {
      const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
      if (!urlPath.startsWith(base)) {
        // 如果 URL 路径不以 basePath 开头，不匹配
        return null;
      }
    }
    
    // 精确匹配
    if (this.routes.has(urlPath)) {
      return this.routes.get(urlPath)!;
    }
    
    // API 路由前缀匹配（支持 Action 模式，如 /api/examples/getExamples 匹配 /api/examples）
    if (urlPath.startsWith('/api/') || (this.basePath !== '/' && urlPath.includes('/api/'))) {
      // 按路径长度从长到短排序，优先匹配更具体的路由
      const apiRoutes = Array.from(this.routes.entries())
        .filter(([_, routeInfo]) => routeInfo.type === 'api')
        .sort(([a], [b]) => b.length - a.length);
      
      for (const [routePath, routeInfo] of apiRoutes) {
        // 如果请求路径以路由路径开头，且下一个字符是 / 或路径结束，则匹配
        if (urlPath.startsWith(routePath) && 
            (urlPath.length === routePath.length || urlPath[routePath.length] === '/')) {
          return routeInfo;
        }
      }
    }
    
    // 动态路由匹配
    for (const [routePath, routeInfo] of this.routes.entries()) {
      if (this.matchDynamicRoute(routePath, urlPath, routeInfo)) {
        return routeInfo;
      }
    }
    
    return null;
  }
  
  /**
   * 匹配动态路由
   */
  private matchDynamicRoute(
    routePath: string,
    urlPath: string,
    routeInfo: RouteInfo
  ): boolean {
    const routeParts = routePath.split('/');
    const urlParts = urlPath.split('/');
    
    if (routeInfo.isCatchAll) {
      // 捕获所有路由
      if (routeParts.length > urlParts.length) {
        return false;
      }
      
      for (let i = 0; i < routeParts.length - 1; i++) {
        if (routeParts[i] !== urlParts[i] && !routeParts[i].startsWith(':')) {
          return false;
        }
      }
      
      return true;
    } else {
      // 普通动态路由
      if (routeParts.length !== urlParts.length) {
        return false;
      }
      
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i] !== urlParts[i] && !routeParts[i].startsWith(':')) {
          return false;
        }
      }
      
      return true;
    }
  }
  
  /**
   * 提取路由参数
   * @param routePath 路由路径
   * @param urlPath URL 路径
   * @param routeInfo 路由信息
   * @returns 参数对象
   */
  extractParams(
    routePath: string,
    urlPath: string,
    routeInfo?: RouteInfo
  ): Record<string, string> {
    const routeParts = routePath.split('/');
    const urlParts = urlPath.split('/');
    const params: Record<string, string> = {};
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        // 安全检查：验证参数名是否为有效标识符
        if (!isValidIdentifier(paramName)) {
          // 参数名无效，跳过
          continue;
        }
        // 获取原始参数值
        params[paramName] = urlParts[i] || '';
      } else if (routeParts[i] === '*' && i === routeParts.length - 1) {
        // 捕获所有
        const paramName = routeInfo?.params?.[0] || 'slug';
        // 安全检查：验证参数名
        if (isValidIdentifier(paramName)) {
          params[paramName] = urlParts.slice(i).join('/');
        }
        break;
      }
    }
    
    // 使用安全工具函数清理所有参数
    return sanitizeRouteParams(params);
  }
  
  /**
   * 获取布局文件路径
   * @param path 路径
   * @returns 布局文件路径
   */
  getLayout(path: string): string | null {
    // 查找最匹配的布局
    let currentPath = path;
    while (currentPath !== '/') {
      if (this.layouts.has(currentPath)) {
        return this.layouts.get(currentPath)!;
      }
      currentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    }
    
    return this.layouts.get('/') || null;
  }
  
  /**
   * 获取中间件文件路径
   * @param path 路径
   * @returns 中间件文件路径数组
   */
  getMiddlewares(path: string): string[] {
    const middlewares: string[] = [];
    
    // 从根路径开始查找
    if (this.middlewares.has('/')) {
      middlewares.push(this.middlewares.get('/')!);
    }
    
    // 查找路径匹配的中间件
    const pathParts = path.split('/').filter(p => p);
    let checkPath = '';
    for (const part of pathParts) {
      checkPath += '/' + part;
      if (this.middlewares.has(checkPath)) {
        middlewares.push(this.middlewares.get(checkPath)!);
      }
    }
    
    return middlewares;
  }
  
  /**
   * 获取错误页面路径
   * @param errorType 错误类型
   * @returns 错误页面文件路径
   */
  getErrorPage(errorType: '404' | 'error' | '500'): string | null {
    return this.errorPages.get(errorType) || null;
  }
  
  /**
   * 获取应用组件文件路径（_app.tsx）
   * @returns 应用组件文件路径
   */
  getApp(): string | null {
    return this.appFilePath;
  }
  
  /**
   * 获取所有路由
   */
  getAllRoutes(): RouteInfo[] {
    return Array.from(this.routes.values());
  }
}


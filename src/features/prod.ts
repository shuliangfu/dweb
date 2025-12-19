/**
 * 生产服务器模块
 * 提供生产环境服务器
 */

import type { AppConfig, Request, Response } from '../types/index.ts';
import { normalizeRouteConfig } from '../core/config.ts';
import { Server } from '../core/server.ts';
import { Router } from '../core/router.ts';
import { RouteHandler } from '../core/route-handler.ts';
import { MiddlewareManager } from '../core/middleware.ts';
import { PluginManager } from '../core/plugin.ts';
import { CookieManager } from '../features/cookie.ts';
import { SessionManager } from '../features/session.ts';
import { logger } from '../middleware/logger.ts';
import { bodyParser } from '../middleware/body-parser.ts';
import { staticFiles } from '../middleware/static.ts';
import { setupSignalHandlers } from './shutdown.ts';
import * as path from '@std/path';
import { loadMainApp, getMiddlewaresFromApp, getPluginsFromApp } from '../utils/app.ts';

/**
 * 预加载所有路由模块、布局和错误页面
 * 解决首次访问延迟问题
 */
async function preloadModules(router: Router): Promise<void> {
  const routes = router.getAllRoutes();
  const preloadPromises: Promise<void>[] = [];

  // 预加载路由模块（页面和 API）
  for (const route of routes) {
    if (route.type === 'page' || route.type === 'api') {
      // route.filePath 已经是绝对路径（从 walk 的 entry.path 获取）
      // 直接使用，避免在 JSR 包上下文中被错误解析
      const modulePath = route.filePath.startsWith("file://")
        ? route.filePath
        : `file://${route.filePath}`;
      preloadPromises.push(
        import(modulePath).catch(() => {
          // 预加载失败时静默处理
        }),
      );
    }
  }

  // 收集所有布局路径
  const layoutPaths = new Set<string>();
  for (const route of routes) {
    const layoutPath = router.getLayout(route.path);
    if (layoutPath) {
      layoutPaths.add(layoutPath);
    }
  }

  // 预加载布局
  for (const layoutPath of layoutPaths) {
    // layoutPath 已经是绝对路径，直接使用
    const modulePath = layoutPath.startsWith("file://")
      ? layoutPath
      : `file://${layoutPath}`;
    preloadPromises.push(
      import(modulePath).catch(() => {
        // 预加载失败时静默处理
      }),
    );
  }

  // 预加载错误页面
  const error404Path = router.getErrorPage('404');
  if (error404Path) {
    const modulePath = error404Path.startsWith("file://")
      ? error404Path
      : `file://${error404Path}`;
    preloadPromises.push(
      import(modulePath).catch(() => {}),
    );
  }

  const errorPagePath = router.getErrorPage('error');
  if (errorPagePath) {
    const modulePath = errorPagePath.startsWith("file://")
      ? errorPagePath
      : `file://${errorPagePath}`;
    preloadPromises.push(
      import(modulePath).catch(() => {}),
    );
  }

  // 预加载 _app.tsx（根应用组件，必需）
  const appPath = router.getApp();
  if (appPath) {
    const modulePath = appPath.startsWith("file://")
      ? appPath
      : `file://${appPath}`;
    preloadPromises.push(
      import(modulePath).catch(() => {}),
    );
  }

  // 等待所有模块预加载完成
  await Promise.all(preloadPromises);
}

/**
 * 设置请求的 Session 支持
 */
function setupSessionSupport(
  req: Request,
  res: Response,
  sessionManager: SessionManager,
  cookieManager: CookieManager | null,
): void {
  const cookieName = sessionManager.getCookieName();
  const sessionId = req.getCookie(cookieName);

  // 添加 createSession 方法
  req.createSession = async (data: Record<string, unknown> = {}) => {
    const session = await sessionManager.create(data);
    req.session = session;

    // 设置 Session Cookie
    if (cookieManager) {
      const cookieValue = await cookieManager.setAsync(
        cookieName,
        session.id,
        {
          httpOnly: true,
          secure: sessionManager['config'].secure || false,
          maxAge: (sessionManager['config'].maxAge || 3600000) / 1000,
        },
      );
      res.setHeader('Set-Cookie', cookieValue);
    }

    return session;
  };

  // 添加 getSession 方法
  req.getSession = async () => {
    if (sessionId) {
      const session = await sessionManager.get(sessionId);
      req.session = session;
      return session;
    }
    return null;
  };

  // 初始化 Session
  if (sessionId) {
    sessionManager.get(sessionId).then((session) => {
      req.session = session;
    });
  }
}

/**
 * 创建请求处理器
 */
function createRequestHandler(
  routeHandler: RouteHandler,
  middlewareManager: MiddlewareManager,
  pluginManager: PluginManager,
  sessionManager: SessionManager | null,
  cookieManager: CookieManager | null,
) {
  return async (req: Request, res: Response): Promise<void> => {
    // 设置 Session 支持
    if (sessionManager) {
      setupSessionSupport(req, res, sessionManager, cookieManager);
    }

    // 执行插件请求钩子
    await pluginManager.executeOnRequest(req, res);

    // 如果插件已经设置了响应（例如 Tailwind CSS 编译），跳过中间件和路由处理
    if (res.body) {
      await pluginManager.executeOnResponse(req, res);
      return;
    }

    // 执行中间件链
    const middlewares = middlewareManager.getAll();
    let index = 0;
    const next = async (): Promise<void> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        await middleware(req, res, next);
      } else {
        // 所有中间件执行完毕，处理路由
        await handleRoute(routeHandler, req, res);

        // 执行插件响应钩子
        await pluginManager.executeOnResponse(req, res);

        // 如果插件清空了响应体，恢复它
        if (!res.body && res.status === 200) {
          res.status = 500;
          res.html('<h1>500 - Internal Server Error</h1><p>响应体在插件处理后丢失</p>');
        }
      }
    };

    await next();
  };
}

/**
 * 处理路由请求
 */
async function handleRoute(
  routeHandler: RouteHandler,
  req: Request,
  res: Response,
): Promise<void> {
  await routeHandler.handle(req, res);

  // 验证响应体已设置
  if (!res.body && res.status === 200) {
    res.status = 500;
    res.text('Internal Server Error: Route handler did not set response body');
  }
}

/**
 * 启动生产服务器
 * @param config 配置对象（单应用配置）
 */
export async function startProdServer(config: AppConfig): Promise<void> {
  if (!config.routes) {
    throw new Error('路由配置 (routes) 是必需的');
  }
  if (!config.build) {
    throw new Error('构建配置 (build) 是必需的');
  }
  if (!config.server) {
    throw new Error('服务器配置 (server) 是必需的');
  }
  const server = new Server();
  const routeConfig = normalizeRouteConfig(config.routes);
  const router = new Router(routeConfig.dir, routeConfig.ignore, config.basePath);

  // 检查是否存在构建输出目录和路由映射文件（生产环境）
  const outDir = config.build!.outDir;
  const routeMapPath = path.join(outDir, '.route-map.json');
  const hasBuildOutput = await Deno.stat(routeMapPath)
    .then(() => true)
    .catch(() => false);

  if (hasBuildOutput) {
    // 生产环境：从构建映射文件加载路由
    // console.log(`📦 从构建输出目录加载路由: ${outDir}`);
    await router.loadFromBuildMap(routeMapPath, outDir);
  } else {
    // 开发环境：扫描源代码目录
    console.log(`📝 从源代码目录扫描路由: ${routeConfig.dir}`);
    await router.scan();
  }

  // 预加载所有模块（解决首次访问延迟问题）
  await preloadModules(router);

  // 创建 Cookie 和 Session 管理器
  let cookieManager: CookieManager | null = null;
  let sessionManager: SessionManager | null = null;

  if (config.cookie) {
    cookieManager = new CookieManager(config.cookie.secret);
  }

  if (config.session) {
    sessionManager = new SessionManager(config.session);
  }

  // 创建路由处理器（传入 Cookie 和 Session 管理器以及配置）
  const routeHandler = new RouteHandler(
    router,
    cookieManager || undefined,
    sessionManager || undefined,
    config,
  );

  // 创建中间件管理器
  const middlewareManager = new MiddlewareManager();

  // 添加内置中间件
  middlewareManager.add(logger({ format: 'combined' }));
  middlewareManager.add(bodyParser());

  // 添加配置的中间件
  // 注意：中间件函数无法序列化，需要从原始配置文件加载
  // 首先尝试从序列化后的配置加载（可能为空或无效）
  let hasValidMiddleware = false;
  if (config.middleware && config.middleware.length > 0) {
    // 检查中间件是否有效（不是 undefined）
    const validMiddlewares = config.middleware.filter((m) => m !== undefined && m !== null);
    if (validMiddlewares.length > 0) {
      middlewareManager.addMany(validMiddlewares);
      hasValidMiddleware = true;
    }
  }
  
  // 如果序列化后的中间件无效，尝试从原始配置文件加载
  if (!hasValidMiddleware) {
    try {
      // 尝试从当前目录加载原始配置文件
      const originalConfigPath = './dweb.config.ts';
      const originalConfigUrl = new URL(originalConfigPath, import.meta.url).href;
      const originalConfigModule = await import(originalConfigUrl);
      const originalConfig = originalConfigModule.default;
      if (originalConfig?.middleware && Array.isArray(originalConfig.middleware) && originalConfig.middleware.length > 0) {
        middlewareManager.addMany(originalConfig.middleware);
        hasValidMiddleware = true;
      }
    } catch (_error) {
      // 如果无法加载原始配置文件，静默失败（只使用内置中间件）
      // 这是正常的，因为中间件函数无法序列化
    }
  }

  // 尝试从 main.ts 加载中间件
  try {
    const mainApp = await loadMainApp();
    if (mainApp) {
      const mainMiddlewares = getMiddlewaresFromApp(mainApp);
      if (mainMiddlewares.length > 0) {
        middlewareManager.addMany(mainMiddlewares);
      }
    }
  } catch (_error) {
    // 加载 main.ts 失败时静默忽略（main.ts 是可选的）
  }

  // 添加静态资源中间件（从构建输出目录）
  // 使用 config.static 配置，如果没有配置则使用默认值 'assets'
  const staticDir = config.static?.dir || 'assets';
  const assetsPath = `${config.build!.outDir}/${staticDir}`;
  try {
    if (
      await Deno.stat(assetsPath)
        .then(() => true)
        .catch(() => false)
    ) {
      // 如果配置了 static，使用完整配置（但更新 dir 为构建输出路径）；否则使用默认配置
      if (config.static) {
        middlewareManager.add(staticFiles({
          ...config.static,
          dir: assetsPath
        }));
      } else {
        middlewareManager.add(staticFiles({ dir: assetsPath }));
      }
    }
  } catch {
    // 静态资源目录不存在时忽略
  }

  // 创建插件管理器
  const pluginManager = new PluginManager();
  if (config.plugins) {
    pluginManager.registerMany(config.plugins);
  }

  // 尝试从 main.ts 加载插件
  try {
    const mainApp = await loadMainApp();
    if (mainApp) {
      const mainPlugins = getPluginsFromApp(mainApp);
      if (mainPlugins.length > 0) {
        pluginManager.registerMany(mainPlugins);
      }
    }
  } catch (_error) {
    // 加载 main.ts 失败时静默忽略（main.ts 是可选的）
  }

  // 执行插件初始化
  await pluginManager.executeOnInit({ server, router, routeHandler });

  // 设置请求处理器
  const requestHandler = createRequestHandler(
    routeHandler,
    middlewareManager,
    pluginManager,
    sessionManager,
    cookieManager,
  );
  server.setHandler(requestHandler);

  // 启动服务器
  const port = config.server!.port;
  const host = config.server!.host || '0.0.0.0';

  // 设置优雅关闭信号监听器
  setupSignalHandlers({ close: () => server.close() });

  await server.start(port, host);
}

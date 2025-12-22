/**
 * 生产服务器模块
 * 提供生产环境服务器
 */

import type { AppConfig, Request, Response } from "../types/index.ts";
import { normalizeRouteConfig } from "../core/config.ts";
import { Server } from "../core/server.ts";
import { Router } from "../core/router.ts";
import { RouteHandler } from "../core/route-handler.ts";
import { MiddlewareManager } from "../core/middleware.ts";
import { PluginManager } from "../core/plugin.ts";
import { CookieManager } from "../features/cookie.ts";
import { SessionManager } from "../features/session.ts";
import { closeDatabase, initDatabase } from "../features/database/access.ts";
import { WebSocketServer } from "../features/websocket/server.ts";
import { initWebSocket } from "../features/websocket/access.ts";
import { GraphQLServer } from "../features/graphql/server.ts";
import { logger } from "../middleware/logger.ts";
import { bodyParser } from "../middleware/body-parser.ts";
import { staticFiles } from "../middleware/static.ts";
import { setupSignalHandlers } from "./shutdown.ts";
import * as path from "@std/path";
import {
  getMiddlewaresFromApp,
  getPluginsFromApp,
  loadMainApp,
} from "../utils/app.ts";

/**
 * 预加载所有路由模块、布局和错误页面
 * 解决首次访问延迟问题
 */
async function preloadModules(router: Router): Promise<void> {
  const routes = router.getAllRoutes();
  const preloadPromises: Promise<void>[] = [];

  // 预加载路由模块（页面和 API）
  for (const route of routes) {
    if (route.type === "page" || route.type === "api") {
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
  const error404Path = router.getErrorPage("404");
  if (error404Path) {
    const modulePath = error404Path.startsWith("file://")
      ? error404Path
      : `file://${error404Path}`;
    preloadPromises.push(
      import(modulePath).catch(() => {}),
    );
  }

  const errorPagePath = router.getErrorPage("error");
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

  // 预加载路由中间件
  const middlewarePaths = router.getAllMiddlewares();
  for (const middlewarePath of middlewarePaths) {
    // middlewarePath 已经是绝对路径，直接使用
    const modulePath = middlewarePath.startsWith("file://")
      ? middlewarePath
      : `file://${middlewarePath}`;
    preloadPromises.push(
      import(modulePath).catch(() => {
        // 预加载失败时静默处理
      }),
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
          secure: sessionManager["config"].secure || false,
          // maxAge 配置单位为秒，直接使用
          maxAge: sessionManager["config"].maxAge || 3600,
        },
      );
      res.setHeader("Set-Cookie", cookieValue);
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
  config: AppConfig,
  staticDir: string,
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

        // 在生产环境中注入 CSS link 标签（如果响应是 HTML）
        // 注意：必须在插件响应钩子之前注入 CSS，确保 CSS 在主题脚本之前加载
        // 从 Tailwind 插件配置中获取 CSS 路径，或使用默认路径
        let cssPath = `${staticDir}/tailwind.css`; // 默认路径

        // 尝试从插件管理器中获取 Tailwind 插件配置
        const tailwindPlugin = pluginManager.getAll().find((p) =>
          p.name === "tailwind"
        );
        if (tailwindPlugin?.config) {
          const pluginConfig = tailwindPlugin.config as any;
          if (pluginConfig?.cssPath) {
            // 使用配置的 CSS 路径，但需要转换为 URL 路径
            cssPath = pluginConfig.cssPath.startsWith("/")
              ? pluginConfig.cssPath.slice(1)
              : pluginConfig.cssPath;
          }
        } else {
          // 如果插件管理器中找不到，尝试从配置中获取
          const configPlugin = config.plugins?.find(
            (p: any) =>
              (typeof p === "object" && "name" in p && p.name === "tailwind") ||
              (typeof p === "object" && "config" in p &&
                (p.config as any)?.cssPath),
          );
          if (
            configPlugin && typeof configPlugin === "object" &&
            "config" in configPlugin
          ) {
            const pluginConfig = (configPlugin as any).config;
            if (pluginConfig?.cssPath) {
              cssPath = pluginConfig.cssPath.startsWith("/")
                ? pluginConfig.cssPath.slice(1)
                : pluginConfig.cssPath;
            }
          }
        }

        // 获取静态资源前缀（如果有配置）
        const staticPrefix = config.static?.prefix;

        // 注入 CSS link 标签
        injectCSSLink(res, cssPath, staticPrefix, staticDir);

        // 执行插件响应钩子（在 CSS 注入之后，确保主题脚本可以正确工作）
        await pluginManager.executeOnResponse(req, res);

        // 如果插件清空了响应体，恢复它
        if (!res.body && res.status === 200) {
          res.status = 500;
          res.html(
            "<h1>500 - Internal Server Error</h1><p>响应体在插件处理后丢失</p>",
          );
        }
      }
    };

    await next();
  };
}

/**
 * 在生产环境中注入 CSS link 标签到 HTML 响应
 * @param res 响应对象
 * @param cssPath CSS 文件路径（相对于静态资源目录）
 * @param staticPrefix 静态资源 URL 前缀（如果有）
 * @param staticDir 静态资源目录名（用于检测路径是否已包含目录前缀）
 */
function injectCSSLink(
  res: Response,
  cssPath: string,
  staticPrefix?: string,
  staticDir?: string,
): void {
  // 只处理 HTML 响应
  if (!res.body || typeof res.body !== "string") {
    return;
  }

  const contentType = res.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return;
  }

  try {
    const html = res.body as string;

    // 构建 CSS 文件 URL
    let cssUrl: string;

    if (staticPrefix) {
      // 如果配置了 static prefix
      // 检查 cssPath 是否已经包含了 staticDir 前缀，如果包含则移除
      let normalizedPath = cssPath;
      if (staticDir && cssPath.startsWith(staticDir + "/")) {
        // 移除 staticDir 前缀，只保留文件名部分
        normalizedPath = cssPath.slice(staticDir.length + 1);
      } else if (staticDir && cssPath.startsWith("/" + staticDir + "/")) {
        // 移除 /staticDir 前缀
        normalizedPath = cssPath.slice(staticDir.length + 2);
      }

      // 确保路径以 / 开头
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath;
      }

      // 确保 staticPrefix 以 / 开头但不以 / 结尾
      const normalizedPrefix = staticPrefix.endsWith("/")
        ? staticPrefix.slice(0, -1)
        : staticPrefix;

      cssUrl = `${normalizedPrefix}${normalizedPath}`;
    } else {
      // 没有配置 static prefix，直接使用路径
      cssUrl = cssPath.startsWith("/") ? cssPath : "/" + cssPath;
    }

    const linkTag = `<link rel="stylesheet" href="${cssUrl}" />`;

    // 检查 <head> 中是否有 <link> 标签（CSS 文件）
    const linkRegex = /<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/i;
    const linkMatch = html.match(linkRegex);

    if (linkMatch && linkMatch.index !== undefined) {
      // 如果找到 <link> 标签，在它之前插入新的 link 标签
      const linkIndex = linkMatch.index;
      res.body = html.slice(0, linkIndex) + `  ${linkTag}\n  ` +
        html.slice(linkIndex);
    } else if (html.includes("</head>")) {
      // 如果没有 <link> 标签，但有 </head>，在 </head> 前面注入
      // 注意：需要找到最后一个 </head>，因为插件可能已经在 </head> 之前注入了脚本
      const lastHeadIndex = html.lastIndexOf("</head>");
      if (lastHeadIndex !== -1) {
        res.body = html.slice(0, lastHeadIndex) + `  ${linkTag}\n` +
          html.slice(lastHeadIndex);
      } else {
        // 如果 lastIndexOf 失败（不应该发生），使用 replace 作为后备
        res.body = html.replace("</head>", `  ${linkTag}\n</head>`);
      }
    } else if (html.includes("<head>")) {
      // 如果没有 </head>，但有 <head>，则在 <head> 后面注入
      res.body = html.replace("<head>", `<head>\n  ${linkTag}`);
    } else {
      // 如果没有 <head>，则在 <html> 后面添加 <head> 和 link
      if (html.includes("<html>")) {
        res.body = html.replace(
          "<html>",
          `<html>\n  <head>\n    ${linkTag}\n  </head>`,
        );
      } else {
        // 如果连 <html> 都没有，在开头添加
        res.body = `<head>\n  ${linkTag}\n</head>\n${html}`;
      }
    }
  } catch (error) {
    console.error("[Prod Server] 注入 CSS link 时出错:", error);
    // 出错时不修改响应
  }
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
    res.text("Internal Server Error: Route handler did not set response body");
  }
}

/**
 * 启动生产服务器
 * @param config 配置对象（单应用配置）
 */
export async function startProdServer(config: AppConfig): Promise<void> {
  if (!config.routes) {
    throw new Error("路由配置 (routes) 是必需的");
  }
  if (!config.build) {
    throw new Error("构建配置 (build) 是必需的");
  }
  if (!config.server) {
    throw new Error("服务器配置 (server) 是必需的");
  }
  const server = new Server();
  const routeConfig = normalizeRouteConfig(config.routes);
  const router = new Router(
    routeConfig.dir,
    routeConfig.ignore,
    config.basePath,
    routeConfig.apiDir,
  );

  // 检查是否存在构建输出目录和路由映射文件（生产环境）
  const outDir = config.build!.outDir;
  // 同时读取服务端和客户端路由映射文件
  const serverRouteMapPath = path.join(outDir, "server.json");
  const clientRouteMapPath = path.join(outDir, "client.json");
  const hasBuildOutput = await Deno.stat(serverRouteMapPath)
    .then(() => true)
    .catch(() => false);

  if (hasBuildOutput) {
    // 生产环境：从构建映射文件加载路由（同时读取 server.json 和 client.json）
    // console.log(`📦 从构建输出目录加载路由: ${outDir}`);
    await router.loadFromBuildMap(
      serverRouteMapPath,
      clientRouteMapPath,
      outDir,
    );
  } else {
    // 开发环境：扫描源代码目录
    console.log(`📝 从源代码目录扫描路由: ${routeConfig.dir}`);
    await router.scan();
  }

  // 预加载所有模块（解决首次访问延迟问题）
  await preloadModules(router);

  // 初始化数据库连接（如果配置了数据库）
  if (config.database) {
    try {
      await initDatabase(config.database);
      console.log("✅ 数据库连接已初始化");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ 数据库连接失败: ${message}`);
      // 不阻止服务器启动，但记录错误
    }
  }

  // 创建 Cookie 和 Session 管理器
  let cookieManager: CookieManager | null = null;
  let sessionManager: SessionManager | null = null;

  if (config.cookie) {
    cookieManager = new CookieManager(config.cookie.secret);
  }

  if (config.session) {
    sessionManager = new SessionManager(config.session);
  }

  // 创建 GraphQL 服务器（如果配置了）
  let graphqlServer: GraphQLServer | null = null;
  if (config.graphql) {
    graphqlServer = new GraphQLServer(
      config.graphql.schema,
      config.graphql.config,
    );
    console.log(
      `✅ GraphQL 服务器已启动 (端点: ${
        config.graphql.config?.path || "/graphql"
      })`,
    );
    if (config.graphql.config?.graphiql !== false) {
      console.log(
        `   GraphiQL: ${config.graphql.config?.graphiqlPath || "/graphiql"}`,
      );
    }
  }

  // 创建路由处理器（传入 Cookie 和 Session 管理器以及配置）
  const routeHandler = new RouteHandler(
    router,
    cookieManager || undefined,
    sessionManager || undefined,
    config,
    graphqlServer || undefined,
  );

  // 创建中间件管理器
  const middlewareManager = new MiddlewareManager();

  // 添加内置中间件
  middlewareManager.add(logger({ format: "combined" }));
  middlewareManager.add(bodyParser());

  // 添加配置的中间件
  // 注意：中间件函数无法序列化，需要从原始配置文件加载
  // 首先尝试从序列化后的配置加载（可能为空或无效）
  let hasValidMiddleware = false;
  if (config.middleware && config.middleware.length > 0) {
    // 检查中间件是否有效（不是 undefined）
    const validMiddlewares = config.middleware.filter((m) =>
      m !== undefined && m !== null
    );
    if (validMiddlewares.length > 0) {
      middlewareManager.addMany(validMiddlewares);
      hasValidMiddleware = true;
    }
  }

  // 如果序列化后的中间件无效，尝试从原始配置文件加载
  if (!hasValidMiddleware) {
    try {
      // 尝试从当前目录加载原始配置文件
      const originalConfigPath = "./dweb.config.ts";
      const originalConfigUrl =
        new URL(originalConfigPath, import.meta.url).href;
      const originalConfigModule = await import(originalConfigUrl);
      const originalConfig = originalConfigModule.default;
      if (
        originalConfig?.middleware &&
        Array.isArray(originalConfig.middleware) &&
        originalConfig.middleware.length > 0
      ) {
        middlewareManager.addMany(originalConfig.middleware);
        hasValidMiddleware = true;
      }
    } catch (_error) {
      // 如果无法加载原始配置文件，静默失败（只使用内置中间件）
      // 这是正常的，因为中间件函数无法序列化
    }
  }

  // 尝试从 main.ts 加载中间件
  // 多应用模式下，从应用目录查找 main.ts（如 backend/main.ts）
  try {
    const mainApp = await loadMainApp(config.name);
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
  const staticDir = config.static?.dir || "assets";
  // 构建完整路径用于检查目录是否存在
  const assetsPath = path.join(config.build!.outDir, staticDir);
  try {
    if (
      await Deno.stat(assetsPath)
        .then(() => true)
        .catch(() => false)
    ) {
      // 如果配置了 static，使用完整配置（但更新 dir 为构建输出路径）；否则使用默认配置
      // 生产环境：传入 outDir 和 isProduction: true，让中间件自动构建完整路径
      if (config.static) {
        middlewareManager.add(staticFiles({
          ...config.static,
          dir: staticDir, // 使用相对路径（如 'assets'），中间件会根据 outDir 自动构建完整路径
          outDir: config.build!.outDir,
          isProduction: true,
        }));
      } else {
        middlewareManager.add(staticFiles({
          dir: staticDir, // 使用相对路径（如 'assets'），中间件会根据 outDir 自动构建完整路径
          outDir: config.build!.outDir,
          isProduction: true,
        }));
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
  // 多应用模式下，从应用目录查找 main.ts（如 backend/main.ts）
  try {
    const mainApp = await loadMainApp(config.name);
    if (mainApp) {
      const mainPlugins = getPluginsFromApp(mainApp);
      if (mainPlugins.length > 0) {
        pluginManager.registerMany(mainPlugins);
      }
    }
  } catch (_error) {
    // 加载 main.ts 失败时静默忽略（main.ts 是可选的）
  }

  // 执行插件初始化（传入 isProduction，优先使用 config 中的值，否则默认为 true 表示生产环境）
  await pluginManager.executeOnInit({
    server,
    router,
    routeHandler,
    isProduction: config.isProduction ?? true,
  });

  // 创建 WebSocket 服务器（如果配置了）
  let wsServer: WebSocketServer | null = null;
  if (config.websocket) {
    wsServer = new WebSocketServer(config.websocket);
    initWebSocket(wsServer);
    console.log(
      `✅ WebSocket 服务器已启动 (路径: ${config.websocket.path || "/ws"})`,
    );

    // 设置 WebSocket 升级处理器
    server.setWebSocketUpgradeHandler((req: globalThis.Request) => {
      const url = new URL(req.url);
      const wsPath = config.websocket!.path || "/ws";
      if (url.pathname === wsPath || url.pathname.startsWith(wsPath + "/")) {
        return wsServer!.handleUpgrade(req);
      }
      return null;
    });
  }

  // 设置请求处理器
  const requestHandler = createRequestHandler(
    routeHandler,
    middlewareManager,
    pluginManager,
    sessionManager,
    cookieManager,
    config,
    staticDir,
  );
  server.setHandler(requestHandler);

  // 启动服务器
  const port = config.server!.port || 3000;
  const host = config.server!.host || "0.0.0.0";

  // 设置优雅关闭信号监听器
  setupSignalHandlers({
    close: async () => {
      await closeDatabase();
      server.close();
    },
  });

  await server.start(port, host);
}

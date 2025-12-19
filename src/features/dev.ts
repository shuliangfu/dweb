/**
 * 开发服务器模块
 * 提供开发环境服务器和热更新功能
 */

import type { AppConfig, Request, Response } from "../types/index.ts";
import { normalizeRouteConfig } from "../core/config.ts";
import { Server } from "../core/server.ts";
import { Router } from "../core/router.ts";
import { preloadImportMapScript, RouteHandler } from "../core/route-handler.ts";
import { MiddlewareManager } from "../core/middleware.ts";
import { PluginManager } from "../core/plugin.ts";
import { CookieManager } from "../features/cookie.ts";
import { SessionManager } from "../features/session.ts";
import { logger } from "../middleware/logger.ts";
import { bodyParser } from "../middleware/body-parser.ts";
import { staticFiles } from "../middleware/static.ts";
import { setupSignalHandlers as _setupSignalHandlers } from "../features/shutdown.ts";
import { createHMRClientScript, FileWatcher, HMRServer } from "./hmr.ts";
import { loadMainApp, getMiddlewaresFromApp, getPluginsFromApp } from "../utils/app.ts";

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
    const session = await sessionManager.createSession(data);
          req.session = session;
          
          // 设置 Session Cookie
          if (cookieManager) {
      const cookieValue = await cookieManager.setCookieAsync(
        cookieName,
        session.id,
        {
                httpOnly: true,
          secure: sessionManager["config"].secure || false,
          maxAge: (sessionManager["config"].maxAge || 3600000) / 1000,
        },
      );
      res.setHeader("Set-Cookie", cookieValue);
          }
          
          return session;
        };
        
        // 添加 getSession 方法
        req.getSession = async () => {
          if (sessionId) {
      const session = await sessionManager.getSession(sessionId);
            req.session = session;
            return session;
          }
          return null;
        };
        
        // 初始化 Session
        if (sessionId) {
    sessionManager.getSession(sessionId).then((session) => {
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
      try {
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
            const errorMsg = "响应体在插件处理后丢失";
            console.error('\n❌ ========== 插件处理错误 ==========');
            console.error('请求路径:', req.url);
            console.error('请求方法:', req.method);
            console.error('错误:', errorMsg);
            console.error('===================================\n');
            res.status = 500;
            res.html(`<h1>500 - Internal Server Error</h1><p>${errorMsg}</p>`);
          }
        }
      } catch (error) {
        // 捕获中间件或路由处理过程中的错误
        console.error('\n❌ ========== 请求处理异常 ==========');
        console.error('请求路径:', req.url);
        console.error('请求方法:', req.method);
        
        if (error instanceof Error) {
          console.error('错误类型:', error.name);
          console.error('错误消息:', error.message);
          if (error.stack) {
            console.error('错误堆栈:');
            console.error(error.stack);
          }
        } else {
          console.error('错误内容:', error);
        }
        console.error('===================================\n');
        
        // 确保错误响应已设置
        if (!res.body || res.status === 200) {
          res.status = 500;
          const errorMessage = error instanceof Error ? error.message : String(error);
          res.html(`<h1>500 - Internal Server Error</h1><p>${errorMessage}</p>`);
        }
        
        // 重新抛出错误，让上层的错误处理机制处理
        throw error;
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
  try {
    await routeHandler.handle(req, res);
    
    // 验证响应体已设置
    if (!res.body && res.status === 200) {
      const errorMsg = "Internal Server Error: Route handler did not set response body";
      console.error('\n❌ ========== 路由处理错误 ==========');
      console.error('请求路径:', req.url);
      console.error('请求方法:', req.method);
      console.error('错误:', errorMsg);
      console.error('===================================\n');
      res.status = 500;
      res.text(errorMsg);
    }
  } catch (error) {
    // 捕获路由处理过程中的错误
    console.error('\n❌ ========== 路由处理异常 ==========');
    console.error('请求路径:', req.url);
    console.error('请求方法:', req.method);
    
    if (error instanceof Error) {
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      if (error.stack) {
        console.error('错误堆栈:');
        console.error(error.stack);
      }
    } else {
      console.error('错误内容:', error);
    }
    console.error('===================================\n');
    
    // 重新抛出错误，让上层的错误处理机制处理
    throw error;
  }
}

export async function startDevServer(config: AppConfig): Promise<void> {
	// 启动 HMR 服务器
	const hmrServer = new HMRServer()
	const hmrPort = config.dev?.hmrPort || 24678
	await hmrServer.start(hmrPort)
	
	// 设置服务器 origin（用于 HMR 编译组件时生成完整的 HTTP URL）
	if (!config.server) {
		throw new Error('服务器配置 (server) 是必需的');
	}
	const serverOrigin = `http://${config.server.host || 'localhost'}:${config.server.port}`
	hmrServer.setServerOrigin(serverOrigin)

	// 设置路由目录（用于判断文件类型，支持多应用模式）
	if (config.routes) {
		const routeConfigForHMR = normalizeRouteConfig(config.routes)
		hmrServer.setRoutesDir(routeConfigForHMR.dir)
	}

	// 设置 HMR 客户端脚本
	const { setHMRClientScript } = await import("../core/route-handler.ts")
	const hmrScript = createHMRClientScript(hmrPort)
	setHMRClientScript(hmrScript)

	// 创建文件监听器
	if (!config.routes) {
		throw new Error('路由配置 (routes) 是必需的');
	}
	const routeConfigForWatcher = normalizeRouteConfig(config.routes)
	const fileWatcher = new FileWatcher(
		config.dev?.reloadDelay || 300,
		routeConfigForWatcher.dir,
	)

	// 监听配置文件变化
	await fileWatcher.watch(".")

	const server = new Server(
		
	)

	// 将文件变化事件连接到 HMR 服务器（智能更新）
	fileWatcher.onReload(async (changeInfo) => {
		await hmrServer.notifyFileChange(changeInfo)
	})

	// config.routes 已经在上面检查过了，这里可以安全使用
	const routeConfig = normalizeRouteConfig(config.routes!)
	const router = new Router(routeConfig.dir, routeConfig.ignore, config.basePath)

	// 扫描路由
	await router.scan()
  
	// 预加载所有模块（解决首次访问延迟问题）
	await preloadModules(router)
  
	// 预先加载 import map 脚本
	await preloadImportMapScript()

	// 创建 Cookie 和 Session 管理器
	let cookieManager: CookieManager | null = null
	let sessionManager: SessionManager | null = null

	if (config.cookie) {
		cookieManager = new CookieManager(config.cookie.secret)
	}

	if (config.session) {
		sessionManager = new SessionManager(config.session)
	}

	// 创建路由处理器（传入 Cookie 和 Session 管理器以及配置）
	const routeHandler = new RouteHandler(
		router,
		cookieManager || undefined,
		sessionManager || undefined,
		config,
	)

	// 创建中间件管理器
	const middlewareManager = new MiddlewareManager()

	// 添加内置中间件
	middlewareManager.add(logger({
		format: "dev",
		// 跳过 .well-known 路径的请求（浏览器自动发送的元数据请求）
		skip: (req) => {
			const url = new URL(req.url)
			return url.pathname.startsWith('/.well-known/')
		}
	}))
	middlewareManager.add(bodyParser())

	// 添加配置的中间件
	if (config.middleware) {
		middlewareManager.addMany(config.middleware)
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

	// 添加静态资源中间件
	// 使用 config.static 配置，如果没有配置则使用默认值 'assets'
	const staticDir = config.static?.dir || "assets"
	try {
		if (
			await Deno.stat(staticDir)
				.then(() => true)
				.catch(() => false)
		) {
			// 如果配置了 static，使用完整配置；否则使用默认配置
			if (config.static) {
				middlewareManager.add(staticFiles(config.static))
			} else {
				middlewareManager.add(staticFiles({ dir: staticDir }))
			}
		}
	} catch {
		// 静态资源目录不存在时忽略
	}

	// 创建插件管理器
	const pluginManager = new PluginManager()
	if (config.plugins) {
		pluginManager.registerMany(config.plugins)
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
	await pluginManager.executeOnInit({ server, router, routeHandler })

	// 设置请求处理器
	const requestHandler = createRequestHandler(
		routeHandler,
		middlewareManager,
		pluginManager,
		sessionManager,
		cookieManager,
	)
	server.setHandler(requestHandler)

	// 启动服务器
	const port = config.server.port
	const host = config.server.host || "localhost"
  
  // 如果配置了自动打开浏览器
  if (config.dev?.open) {
    setTimeout(() => {
			const url = `http://${host}:${port}`
      try {
				const command = new Deno.Command("open", {
          args: [url],
					stdout: "null",
					stderr: "null",
				})
				command.spawn()
      } catch {
        // 忽略错误
      }
		}, 1000)
  }
  
	await server.start(port, host)
	
}
/**
 * CSR 客户端脚本构建器
 *
 * 职责：
 * - 构建客户端入口文件（_client.tsx -> _client.js）
 * - 提供客户端脚本服务（/_client.js 路由）
 * - 支持开发模式热更新
 *
 * 工作流程：
 * 1. 扫描路由目录，获取所有路由组件
 * 2. 生成带有静态导入的临时入口文件
 * 3. 使用 esbuild 编译为浏览器可执行的 JS
 * 4. 注册中间件服务编译后的脚本
 *
 * 注意：
 * - 不再依赖动态 import()，所有路由组件在构建时静态导入
 * - 这样 esbuild 可以正确打包所有依赖
 */

import { BuilderClient, type BuildPlugin } from "@dreamer/esbuild";
import type { ServiceContainer } from "@dreamer/service";
import {
  basename,
  cwd,
  dirname,
  ensureDir,
  exists,
  getEnv,
  join,
  readdir,
  readTextFile,
  relative,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";

import type { AppConfig } from "../types/app.ts";
import {
  getDreamerClientCacheDir,
  getInferredBuildOutputDirs,
} from "../utils/build-dirs.ts";
import {
  CLIENT_ENTRY_FILENAME,
  CLIENT_OUTPUT_MAIN_FILENAME,
} from "../utils/constants.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import {
  normalizePathForCompare,
  pathForLog,
  resolveRouterRoutesDirPath,
} from "../utils/path.ts";
import {
  buildChunkIndices,
  buildRouteChunkUrlMap,
  getChunkFileNameForComponent,
} from "./csr-client-chunk.ts";
import {
  generateClientDepContent,
  type ClientDepRenderMode,
} from "./csr-client-dep.ts";
import {
  getRouteClientManifest,
  type RouteComponentInfo,
} from "./csr-client-route-manifest.ts";
import { createStripLoadPlugin } from "./strip-load-plugin.ts";

// 向后兼容：chunk 纯函数从 csr-client-chunk 拆出，仍从此模块 re-export
export {
  buildChunkIndices,
  buildRouteChunkUrlMap,
  findChunkContent,
  getChunkBaseName,
  getChunkFileNameForComponent,
  isClientChunkFile,
} from "./csr-client-chunk.ts";

export { generateClientDepContent } from "./csr-client-dep.ts";
export type { ClientDepRenderMode } from "./csr-client-dep.ts";

/**
 * 为客户端 bundle 注册 esbuild 插件：在路由目录下剔除 `load` 导出（strip-load），避免打进浏览器 chunk。
 * 各引擎行为一致；View `.tsx` 由运行时与 `deno.json` 的 JSX 配置处理。
 *
 * @param _engine - 渲染引擎（保留参数便于将来按引擎扩展插件）
 * @param routesDirPath - 路由目录绝对路径（与 `router.routesDir` 解析结果一致）
 * @returns 供 `BuilderClient` / `Builder` 的 `plugins` 数组
 */
export function createDwebClientBundlePlugins(
  _engine: "react" | "preact" | "view",
  routesDirPath: string,
): BuildPlugin[] {
  const routesAbs = resolve(routesDirPath);
  return [createStripLoadPlugin(routesAbs)];
}

/**
 * 客户端脚本构建结果
 */
export interface ClientBuildResult {
  /** 编译后的 JavaScript 代码（单文件模式）或主入口内容（代码分割模式） */
  code: string;
  /** 源映射（可选） */
  sourceMap?: string;
  /** 构建时间戳 */
  buildTime: number;
  /** 输出目录（代码分割模式，仅 prod/ dev 代码分割） */
  outputDir?: string;
  /** 所有输出文件（代码分割模式） */
  outputFiles?: Map<string, string>;
  /** basename -> content 索引，用于 findChunkContent O(1) 查找（避免线性遍历） */
  chunkContentIndex?: Map<string, string>;
  /** base（如 routes、index）-> content 索引，用于 HMR 回退 O(1) 查找 */
  chunkBaseIndex?: Map<string, string>;
  /** 本次变更对应路由的 chunk 的 URL（HMR 无感刷新用，如 /_client/index-XXX.js） */
  chunkUrl?: string;
  /**
   * 开发态：各页面路由对应的 chunk URL（与 ROUTE_LOADERS 的 key 一致）。
   * 改共享组件时与 `chunkUrl` 一并下发，供客户端按当前路由强制 `import` 而无需整页刷新。
   */
  routeChunkUrls?: Record<string, string>;
}

/**
 * 构建客户端脚本时的可选参数
 * 用于 HMR 无感刷新等场景
 */
export interface BuildClientScriptOptions {
  /** 变更的文件路径（用于计算 chunkUrl 以支持无感刷新） */
  changedPath?: string;
}

/** 缓存的客户端脚本 */
let cachedClientScript: ClientBuildResult | null = null;

/** 开发模式增量构建：缓存的 BuilderClient 实例，用于 context + rebuild 加速 HMR */
let cachedDevBuilder: BuilderClient | null = null;

/**
 * 从变更文件路径推导路由 componentPath（如 .../routes/index.tsx -> index）
 * 会统一将路径规范化为绝对路径再比较，避免相对路径与绝对路径不一致导致匹配失败。
 * 特别处理 routesDirPath 中可能存在的 ./（如 basic/./src/routes）与 filePath 不含 ./ 的不一致。
 */
function getComponentPathFromFilePath(
  routesDirPath: string,
  filePath: string,
): string | null {
  const normalizedRoutes = normalizePathForCompare(routesDirPath);
  const normalizedFile = normalizePathForCompare(filePath);
  if (!normalizedFile.includes(normalizedRoutes)) {
    return null;
  }
  const relative = normalizedFile.slice(
    normalizedFile.indexOf(normalizedRoutes) + normalizedRoutes.length,
  ).replace(/^\//, "").replace(/\.(tsx?|jsx?)$/, "");
  return relative || null;
}

/**
 * 变更文件是否位于「routes 的父目录（通常为 src）」下、且不在 routes 目录内。
 * 例如 `src/config/main.ts`、共享组件等：无单一 `chunkUrl`，但会随构建下发 `routeChunkUrls`，由客户端按当前路由 `import` 刷新；
 * 与 `_client.tsx` 一样不应打「无法推导 componentPath」的 WARN。
 *
 * @param routesDirPath 路由目录绝对路径（与 scanRouteComponents 一致）
 * @param filePath 变更文件的绝对或相对路径
 */
function isNonRouteSrcUnderAppSrc(
  routesDirPath: string,
  filePath: string,
): boolean {
  const routesAbs = normalizePathForCompare(resolve(routesDirPath));
  const srcRootAbs = normalizePathForCompare(resolve(routesAbs, ".."));
  const fileAbs = normalizePathForCompare(resolve(filePath));
  const underSrc = fileAbs === srcRootAbs ||
    fileAbs.startsWith(srcRootAbs + "/");
  const underRoutes = fileAbs === routesAbs ||
    fileAbs.startsWith(routesAbs + "/");
  return underSrc && !underRoutes;
}

/**
 * 从容器中读取 Tailwind / UnoCSS 等插件的配置，计算开发态 HMR CSS URL 与 style 元素 id
 * 供生成 client 时写入代码，HMR 无感刷新后按该 URL 拉取最新 CSS 并替换对应 style 内容
 *
 * @param container 服务容器（含 tailwindConfig / unocssConfig 等）
 * @returns { url, styleId } 列表
 */
function getHmrCssEntries(container: ServiceContainer): Array<{
  url: string;
  styleId: string;
}> {
  const entries: Array<{ url: string; styleId: string }> = [];
  type CssConfig = { assetsPath?: string; cssEntry?: string };
  const norm = (assetsPath: string): string =>
    assetsPath.startsWith("/")
      ? assetsPath.replace(/\/$/, "")
      : "/" + (assetsPath || "assets").replace(/\/$/, "");
  if (container.has("tailwindConfig")) {
    const c = container.get<CssConfig>("tailwindConfig");
    const base = c?.cssEntry ? basename(c.cssEntry, ".css") : "tailwind";
    entries.push({
      url: norm(c?.assetsPath ?? "/assets") + "/" + base + ".css",
      styleId: "tailwindcss-injected",
    });
  }
  if (container.has("unocssConfig")) {
    const c = container.get<CssConfig>("unocssConfig");
    const base = c?.cssEntry ? basename(c.cssEntry, ".css") : "unocss";
    entries.push({
      url: norm(c?.assetsPath ?? "/assets") + "/" + base + ".css",
      styleId: "unocss-injected",
    });
  }
  return entries;
}

/** _client.dep.tsx 文件名（与 _client.tsx 同目录，每次启动重新生成，供 _client.tsx 导入） */
const CLIENT_DEP_FILENAME = "_client.dep.tsx";

/** 客户端主入口输出文件名（单文件模式），统一从 constants 导出便于引用 */
export { CLIENT_OUTPUT_MAIN_FILENAME } from "../utils/constants.ts";

/**
 * 生成 client.tsx 入口代码（瘦身版：从 client.dep.tsx 导入，仅含 bootstrap 逻辑）
 * client.tsx 仅当不存在时生成，便于用户修改入口；client.dep.tsx 每次构建会重新生成。
 *
 * @param engine 渲染引擎
 * @param components 路由组件列表（未使用，路由列表在 client.dep 中）
 * @param hasLayout 是否存在布局文件（未使用）
 * @param _hmrCssEntries 未使用（已在 client.dep 中）
 */
function generateStaticClientEntry(
  _engine: "react" | "preact" | "view",
  _components: RouteComponentInfo[],
  _hasLayout: boolean,
  _hmrCssEntries: Array<{ url: string; styleId: string }>,
): string {
  return `/**
 * 客户端入口文件（由 @dreamer/dweb 自动生成，仅当不存在时生成，可手动编辑）
 * 从 _client.dep.tsx 导入 initApp；在 .then((app) => { ... }) 中可直接使用 app。
 * - i18n：i18n.onChange(() => app.renderCurrentRoute())
 * - 路由拦截：app.router.beforeRoute((to, from) => { ... })、app.router.afterRoute((to, from) => { ... })
 */

import { initApp } from "./${CLIENT_DEP_FILENAME}";

initApp()
  .then((app) => {
    // 获取当前路由（两种方式任选其一）
    const pathname = globalThis.location?.pathname || "/";
    const currentRoute = app.router.getCurrentRoute?.() ??
      app.router.match(pathname);
    if (currentRoute) {
      console.log(
        ${JSON.stringify($tr("client.routeCurrent"))},
        currentRoute.route.component,
        currentRoute.params,
      );
    }

    // 路由前置守卫（拦截）：在导航前执行，返回 false 阻止导航，返回 string 重定向到该路径
    app.router.beforeRoute((_to, _from) => {
      // 示例：需要登录的页面重定向到登录
      // if (to?.route.meta?.requiresAuth && !isLoggedIn()) return "/login";
      // 示例：阻止访问某路径
      // if (to?.route.component === "admin") return false;
      return true; // allow
    });

    // 路由后置守卫：导航完成后执行（可做埋点、日志等）
    app.router.afterRoute((to, _from) => {
      if (to) {
        console.log(${
    JSON.stringify($tr("client.routeSwitched"))
  }, to.route.component, to.params, to.query);
      }
    });
  })
  .catch(console.error);
`;
}

/**
 * 仅生成并写入客户端入口文件 client.tsx（不执行 esbuild）
 *
 * 用于开发模式：即使已有预构建的 dist/client/client.js，
 * 也保证 src/client.tsx 存在，便于查看和 HMR 无感刷新。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 写入的 client.tsx 路径
 */
export async function ensureClientEntryFile(
  container: ServiceContainer,
  config: AppConfig,
): Promise<string> {
  const logger = getLogger(container);

  const routerConfig = (config.router || {}) as { routesDir?: string };
  const routesDirPath = resolveRouterRoutesDirPath(
    cwd(),
    routerConfig.routesDir || "./src/routes",
  );
  const srcDir = join(routesDirPath, "..");
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "csr" | "hybrid" | "ssr" | "ssg";
  };
  const engine = renderConfig.engine || "preact";
  const renderMode = (renderConfig.mode ?? "hybrid") as ClientDepRenderMode;

  const { components, hasLayout, routeLayoutKeys } =
    await getRouteClientManifest(
      container,
      routesDirPath,
      engine,
    );

  if (await exists(tempClientEntryPath)) {
    logger.debug(
      $tr("log.clientEntryExists", {
        path: pathForLog(tempClientEntryPath),
      }),
    );
    return tempClientEntryPath;
  }

  const hmrCssEntries = getHmrCssEntries(container);
  const clientDepPath = join(srcDir, CLIENT_DEP_FILENAME);
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    routesDirPath,
    hasLayout,
    hmrCssEntries,
    renderMode,
    routeLayoutKeys,
  );
  await writeTextFile(clientDepPath, clientDepCode);
  logger.debug($tr("log.clientDepGenerated", {
    path: pathForLog(clientDepPath),
  }));

  const clientEntryCode = generateStaticClientEntry(
    engine,
    components,
    hasLayout,
    hmrCssEntries,
  );
  await writeTextFile(tempClientEntryPath, clientEntryCode);
  logger.debug($tr("log.clientEntryGenerated", {
    path: pathForLog(tempClientEntryPath),
  }));
  return tempClientEntryPath;
}

/**
 * 准备客户端构建入口（生成 _client.dep.tsx、_client.tsx）
 *
 * 供 runBuildWithBuilder 在调用 Builder.build() 前执行，
 * 仅负责入口文件生成，不执行编译。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 客户端构建配置（entry、output、engine、bundle），供 Builder 使用
 */
export async function prepareClientBuildEntry(
  container: ServiceContainer,
  config: AppConfig,
): Promise<{
  entry: string;
  output: string;
  engine: "react" | "preact" | "view";
  bundle: {
    minify?: boolean;
    sourcemap?: boolean;
    splitting?: boolean;
    format?: "esm";
    external?: string[];
    alias?: Record<string, string>;
  };
}> {
  const logger = getLogger(container);
  const routerConfig = (config.router || {}) as { routesDir?: string };
  const routesDirPath = resolveRouterRoutesDirPath(
    cwd(),
    routerConfig.routesDir || "./src/routes",
  );
  const srcDir = join(routesDirPath, "../");
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "csr" | "hybrid" | "ssr" | "ssg";
  };
  const engine = (renderConfig.engine || "preact") as
    | "react"
    | "preact"
    | "view";
  const renderMode = (renderConfig.mode ?? "hybrid") as ClientDepRenderMode;

  const { components, hasLayout, routeLayoutKeys } =
    await getRouteClientManifest(
      container,
      routesDirPath,
      engine,
    );
  logger.debug($tr("log.routesScanned", { count: String(components.length) }));

  const hmrCssEntries = getHmrCssEntries(container);
  const clientDepPath = join(resolve(srcDir), CLIENT_DEP_FILENAME);

  // Windows：写入前确保父目录存在，避免 NotFound (os error 3)
  await ensureDir(dirname(clientDepPath));

  // 每次构建都刷新 _client.dep.tsx
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    routesDirPath,
    hasLayout,
    hmrCssEntries,
    renderMode,
    routeLayoutKeys,
  );
  await writeTextFile(clientDepPath, clientDepCode);
  logger.debug(
    $tr("log.clientDepRefreshed", { path: pathForLog(clientDepPath) }),
  );

  // _client.tsx 不存在时生成（确保父目录存在）
  if (!(await exists(tempClientEntryPath))) {
    await ensureDir(dirname(tempClientEntryPath));
    const clientEntryCode = generateStaticClientEntry(
      engine,
      components,
      hasLayout,
      hmrCssEntries,
    );
    await writeTextFile(tempClientEntryPath, clientEntryCode);
    logger.debug($tr("log.clientEntryGenerating", {
      path: pathForLog(tempClientEntryPath),
    }));
  }

  const buildConfig = (config.build || {}) as {
    client?: {
      output?: string;
      bundle?: {
        splitting?: boolean;
        minify?: boolean;
        sourcemap?: boolean;
        external?: string[];
        alias?: Record<string, string>;
      };
    };
  };
  const userClientConfig = buildConfig.client || {};
  const userBundleConfig = userClientConfig.bundle || {};
  const clientOutputDirRaw = userClientConfig.output ??
    getInferredBuildOutputDirs().client;
  const finalOutputDir = join(cwd(), clientOutputDirRaw);

  const runtimeExternalBlocklist = engine === "preact"
    ? ["preact", "preact/hooks", "preact/jsx-runtime"]
    : engine === "view"
    ? ["@dreamer/view", "@dreamer/view/jsx-runtime"]
    : ["react", "react-dom", "react/jsx-runtime", "react-dom/client"];
  const userExternal = Array.isArray(userBundleConfig.external)
    ? userBundleConfig.external
    : [];
  const externalList = userExternal.filter(
    (ext) =>
      !runtimeExternalBlocklist.some((b) =>
        ext === b || ext.startsWith(`${b}/`)
      ),
  );

  const bundleAlias = userBundleConfig.alias;

  return {
    entry: tempClientEntryPath,
    output: finalOutputDir,
    engine,
    bundle: {
      minify: userBundleConfig.minify ?? true,
      sourcemap: userBundleConfig.sourcemap ?? false,
      splitting: userBundleConfig.splitting ?? true,
      format: "esm",
      external: externalList.length > 0 ? externalList : undefined,
      alias: bundleAlias,
    },
  };
}

/**
 * 当 build.client.debug 为 true 时，包装 logger 使 esbuild 的 debug 日志同时打到 console，
 * 不依赖应用 logger 的 level 配置，便于排查 resolver/构建问题。
 *
 * @param debug 是否启用构建调试
 * @param logger 应用 logger
 * @returns 原 logger 或带 console 输出的包装 logger
 */
function wrapLoggerForBuildDebug(
  debug: boolean,
  logger?: {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
  },
): typeof logger {
  if (!debug || !logger) return logger;
  return {
    ...logger,
    debug: (msg: string, data?: unknown) => {
      // 只打一次：用 logger.debug，避免与 logger 自带的 [DEBUG] 重复（不再额外 console.log）
      logger.debug(msg, data);
    },
  };
}

/**
 * 开发模式构建：创建 context + rebuild，缓存 builder 供后续增量 rebuild
 *
 * @param entryPath 入口文件路径（_client.tsx）
 * @param outputDir 输出目录（用于 esbuild 路径解析，write: false 时不写盘）
 * @param engine 渲染引擎
 * @param routesDirPath 路由目录绝对路径（用于 strip-load 插件，客户端 bundle 剔除 load 及依赖）
 * @param debug 是否启用 esbuild 调试日志
 * @param logger 日志实例
 * @param lang 语言
 * @returns 构建结果（含 outputContents）
 */
async function doDevBuild(
  entryPath: string,
  outputDir: string,
  engine: "react" | "preact" | "view",
  routesDirPath: string,
  debug?: boolean,
  logger?: {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
  },
  lang?: "en-US" | "zh-CN",
): Promise<{
  outputContents?: Array<{ path: string; text: string; contents?: Uint8Array }>;
}> {
  const buildLogger = wrapLoggerForBuildDebug(debug ?? false, logger);

  const builder = new BuilderClient({
    entry: entryPath,
    output: outputDir,
    engine,
    debug,
    logger: buildLogger,
    bundle: {
      minify: false,
      sourcemap: true,
      splitting: true,
      format: "esm",
      chunkNames: "[name]-[hash]",
    },
    lang,
    plugins: createDwebClientBundlePlugins(engine, routesDirPath),
  });
  await builder.createContext("dev", { write: false });
  cachedDevBuilder = builder;
  return builder.rebuild();
}

/**
 * 构建客户端入口脚本（支持代码分割）
 *
 * 使用 BuilderClient 进行构建，启用代码分割：
 * - 入口文件 → client.js
 * - 共享依赖（preact/react）→ chunk-xxx.js
 * - 按需加载页面组件
 *
 * 开发模式传入 options.changedPath 时，会返回 chunkUrl 供 HMR 无感刷新使用。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @param options 可选（如 changedPath 用于计算 chunkUrl）
 * @returns 构建结果
 */
export async function buildClientScript(
  container: ServiceContainer,
  config: AppConfig,
  options?: BuildClientScriptOptions,
): Promise<ClientBuildResult> {
  const logger = getLogger(container);

  // 获取客户端入口文件路径
  const routerConfig = (config.router || {}) as { routesDir?: string };

  const routesDirPath = resolveRouterRoutesDirPath(
    cwd(),
    routerConfig.routesDir || "./src/routes",
  );
  const srcDir = join(routesDirPath, "..");

  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  logger.debug($tr("log.clientScriptBuilding", {
    path: pathForLog(tempClientEntryPath),
  }));

  try {
    // 获取运行模式（提前计算，用于决定是否写入 client.dep.tsx 避免 HMR 循环）
    const serverConfig = (config.server || {}) as { mode?: "dev" | "prod" };
    // 仅 RUNTIME_ENV=dev 走 dev 压缩策略；build/start 走 prod（esbuild mode）
    const mode = (serverConfig.mode ??
      (getEnv("RUNTIME_ENV") === "dev" ? "dev" : "prod")) as
        | "dev"
        | "prod";
    const isProd = mode === "prod";

    // 若本次构建由 client.dep.tsx / client.tsx 变更触发，开发模式下不再写回该文件，避免：写文件 -> watch 触发 -> 再构建 -> 再写 -> 循环导致疯狂请求
    const changedBasenameForWrite = options?.changedPath
      ? basename(resolve(options.changedPath))
      : "";
    const skipWritingClientDep = !isProd &&
      (changedBasenameForWrite === CLIENT_DEP_FILENAME ||
        changedBasenameForWrite === CLIENT_ENTRY_FILENAME);

    // 获取渲染引擎与模式（view 时按 mode 选 view/csr 或 view/hybrid）
    const renderConfig = (config.render || {}) as {
      engine?: "react" | "preact" | "view";
      mode?: "csr" | "hybrid" | "ssr" | "ssg";
    };
    const engine = renderConfig.engine || "preact";
    const renderMode = (renderConfig.mode ?? "hybrid") as ClientDepRenderMode;

    // 构建调试：仅使用 config.build.client.debug / config.build.server.debug 传递至 esbuild
    const buildConfig = config.build as {
      client?: { debug?: boolean };
      server?: { debug?: boolean };
      debug?: boolean;
    } | undefined;
    const buildDebug = buildConfig?.client?.debug ??
      buildConfig?.server?.debug ??
      buildConfig?.debug ??
      false;

    // 优先复用已初始化 Router 的扫描结果；无 Router 时回退到文件系统扫描。
    const { components, hasLayout, routeLayoutKeys } =
      await getRouteClientManifest(
        container,
        routesDirPath,
        engine,
      );
    logger.debug($tr("log.routesScanned", {
      count: String(components.length),
    }));

    const hmrCssEntries = getHmrCssEntries(container);
    const clientDepPath = join(srcDir, CLIENT_DEP_FILENAME);

    // client.dep.tsx 每次构建/启动都重新生成（路由、HMR CSS、loadLayouts、setupHydrationRouterAndHmr 等）
    // 开发态且本次由 client 入口文件变更触发时跳过写入，避免 watch 循环
    const clientDepCode = generateClientDepContent(
      engine,
      components,
      routesDirPath,
      hasLayout,
      hmrCssEntries,
      renderMode,
      routeLayoutKeys,
    );
    if (!skipWritingClientDep) {
      await writeTextFile(clientDepPath, clientDepCode);
      logger.debug($tr("log.clientDepRefreshed", {
        path: pathForLog(clientDepPath),
      }));
    } else {
      logger.debug(
        $tr("log.hmrSkipClientDep", { filename: CLIENT_DEP_FILENAME }),
      );
    }

    // 仅当 client.tsx 不存在时生成并写入，存在则直接使用（便于用户修改入口逻辑）
    // 开发态且本次由 client 入口变更触发时也跳过写入
    if (!skipWritingClientDep && !(await exists(tempClientEntryPath))) {
      const clientEntryCode = generateStaticClientEntry(
        engine,
        components,
        hasLayout,
        hmrCssEntries,
      );
      await writeTextFile(tempClientEntryPath, clientEntryCode);
      logger.debug($tr("log.clientEntryGenerating", {
        path: pathForLog(tempClientEntryPath),
      }));
    }

    let result: ClientBuildResult;

    if (isProd) {
      // ========================================
      // 生产模式：使用 BuilderClient，支持代码分割
      // ========================================
      const buildConfig = (config.build || {}) as {
        client?: {
          output?: string;
          bundle?: {
            splitting?: boolean;
            minify?: boolean;
            sourcemap?: boolean;
            external?: string[];
            alias?: Record<string, string>;
          };
        };
      };
      const userClientConfig = buildConfig.client || {};
      const userBundleConfig = userClientConfig.bundle || {};

      // 使用用户配置或推断值：未配置时按当前入口推断应用目录（如 dist/backend/client）
      const clientOutputDirRaw = userClientConfig.output ??
        getInferredBuildOutputDirs().client;
      const finalOutputDir = join(cwd(), clientOutputDirRaw);
      const shouldMinify = userBundleConfig.minify ?? true;
      const shouldSourcemap = userBundleConfig.sourcemap ?? false;
      const shouldSplit = userBundleConfig.splitting ?? true;

      // 确保输出目录存在
      await ensureDir(finalOutputDir);

      // 过滤掉用户 external 中的 preact/react，防止误配置导致多实例水合错误
      const userExternal = Array.isArray(userBundleConfig.external)
        ? userBundleConfig.external
        : [];
      const runtimeExternalBlocklist = engine === "preact"
        ? ["preact", "preact/hooks", "preact/jsx-runtime"]
        : engine === "view"
        ? ["@dreamer/view", "@dreamer/view/jsx-runtime"]
        : ["react", "react-dom", "react/jsx-runtime", "react-dom/client"];
      const externalList = userExternal.filter(
        (ext) =>
          !runtimeExternalBlocklist.some((b) =>
            ext === b || ext.startsWith(`${b}/`)
          ),
      );

      const prodBundleAlias = userBundleConfig.alias;

      const buildLogger = wrapLoggerForBuildDebug(buildDebug, logger);

      const builder = new BuilderClient({
        entry: tempClientEntryPath,
        output: finalOutputDir,
        engine,
        debug: buildDebug,
        logger: buildLogger,
        bundle: {
          minify: shouldMinify,
          sourcemap: shouldSourcemap,
          splitting: shouldSplit,
          format: "esm",
          external: externalList.length > 0 ? externalList : undefined,
          alias: prodBundleAlias,
        },
        lang: config.language === "zh-CN" || config.language === "en-US"
          ? config.language
          : undefined,
        plugins: createDwebClientBundlePlugins(engine, routesDirPath),
      });

      await builder.build(mode);

      const outputFiles = new Map<string, string>();
      await loadOutputFiles(finalOutputDir, finalOutputDir, outputFiles);

      // 获取主入口文件内容（入口 _client.tsx → 输出 _client.js）
      const mainCode = outputFiles.get(CLIENT_OUTPUT_MAIN_FILENAME) || "";

      // 统计构建结果并输出文件列表
      let totalSize = 0;
      const fileList: string[] = [];
      for (const [fileName, content] of outputFiles) {
        totalSize += content.length;
        const sizeKB = (content.length / 1024).toFixed(1);
        fileList.push(`  - ${fileName} (${sizeKB} KB)`);
      }

      // 输出构建信息
      logger.info(
        $tr("log.clientBuildOutput", { count: String(outputFiles.size) }),
      );
      for (const file of fileList) {
        logger.info(file);
      }
      logger.info($tr("log.clientBuildTotalSize", {
        size: (totalSize / 1024).toFixed(1),
      }));

      const { chunkContentIndex, chunkBaseIndex } = buildChunkIndices(
        outputFiles,
      );
      result = {
        code: mainCode,
        buildTime: Date.now(),
        outputDir: finalOutputDir,
        outputFiles,
        chunkContentIndex,
        chunkBaseIndex,
      };
    } else {
      // ========================================
      // 开发模式：纯内存构建，使用 ~/.dreamer/{projectHash}/{appDir}/client-out 缓存，避免在项目内创建临时目录
      // ========================================
      const memOutputDir = getDreamerClientCacheDir();
      await ensureDir(memOutputDir);

      let buildResultDev;
      if (cachedDevBuilder) {
        // 复用已有 context，增量 rebuild（复用文件缓存、AST，加快 HMR）
        try {
          buildResultDev = await cachedDevBuilder.rebuild();
        } catch (err) {
          logger.warn($tr("log.hmrIncrementalRebuildFailed") + ":", err);
          await cachedDevBuilder.dispose();
          cachedDevBuilder = null;
          buildResultDev = await doDevBuild(
            tempClientEntryPath,
            memOutputDir,
            engine,
            routesDirPath,
            buildDebug,
            logger,
            config.language === "zh-CN" || config.language === "en-US"
              ? config.language
              : undefined,
          );
        }
      } else {
        buildResultDev = await doDevBuild(
          tempClientEntryPath,
          memOutputDir,
          engine,
          routesDirPath,
          buildDebug,
          logger,
          config.language === "zh-CN" || config.language === "en-US"
            ? config.language
            : undefined,
        );
      }

      const outputFilesDev = new Map<string, string>();
      if (buildResultDev.outputContents) {
        const memOutNorm = memOutputDir.replace(/\\/g, "/");
        // 调试：输出 esbuild 原始 outputContents（path + 大小），便于对比 Windows/Mac 差异
        // 使用 console.log 直接输出，不受 logger.level 限制，仅由 build.client.debug 控制
        if (buildDebug) {
          const rawList = buildResultDev.outputContents
            .filter((f) => f.path.endsWith(".js") && !f.path.includes(".map"))
            .map((f) =>
              `${basename(f.path)}:${(f.text.length / 1024).toFixed(1)}KB`
            )
            .join(", ");
          console.log(
            "[DEBUG] [dweb] esbuild outputContents (path basename: size):",
            rawList,
          );
        }
        for (const file of buildResultDev.outputContents) {
          const name = basename(file.path);
          const existing = outputFilesDev.get(name);
          // 冲突检测：若 basename 已存在且内容不同，优先保留内容更大的 chunk（preact 等实现通常远大于 __publicField）
          if (existing !== undefined && existing !== file.text) {
            if (buildDebug) {
              logger.debug(
                `[dweb] chunk basename collision: ${name}, existing ${existing.length}B vs new ${file.text.length}B, keeping larger`,
              );
            }
            if (file.text.length > existing.length) {
              outputFilesDev.set(name, file.text);
            }
            // 否则保留 existing，不覆盖
          } else {
            outputFilesDev.set(name, file.text);
          }
          // 多段路径兼容（dev）：浏览器请求 routes/index-XXX.js，esbuild path 含 outdir 前缀
          const pathNorm = file.path.replace(/\\/g, "/");
          const relPath = pathNorm.startsWith(memOutNorm)
            ? pathNorm.slice(memOutNorm.length).replace(/^\/+/, "")
            : relative(memOutputDir, file.path).replace(/\\/g, "/");
          if (relPath && relPath !== name && !relPath.startsWith("..")) {
            const existingRel = outputFilesDev.get(relPath);
            if (
              existingRel === undefined ||
              existingRel === file.text ||
              file.text.length > (existingRel?.length ?? 0)
            ) {
              outputFilesDev.set(relPath, file.text);
            }
          }
        }
      }

      const mainCodeDev = outputFilesDev.get(CLIENT_OUTPUT_MAIN_FILENAME) || "";
      logger.debug(
        $tr("log.clientBuildCompleteMemory", {
          mainSize: (mainCodeDev.length / 1024).toFixed(1),
          count: String(outputFilesDev.size),
        }),
      );
      // 调试：输出 chunk 列表及每个 chunk 的 content 大小，便于在 Windows 上对比依赖请求是否缺失
      // preact/react 等运行时通常 >10KB，__publicField 等辅助代码通常 <1KB，若 chunk-XXX 显示过小则可能内容错误
      if (buildDebug) {
        const chunkNames = [
          ...new Set(
            Array.from(outputFilesDev.keys()).filter(
              (k) => k.endsWith(".js") && k !== CLIENT_OUTPUT_MAIN_FILENAME,
            ),
          ),
        ].sort();
        logger.debug("[dweb] dev chunks:", chunkNames.join(", "));
        const chunkSizes = chunkNames
          .map((k) => {
            const len = outputFilesDev.get(k)?.length ?? 0;
            const runtimeHint = k.startsWith("chunk-") && len < 2000
              ? " (⚠️可能为__publicField而非运行时)"
              : "";
            return `${k}:${(len / 1024).toFixed(1)}KB${runtimeHint}`;
          })
          .join(", ");
        logger.debug("[dweb] dev chunk sizes:", chunkSizes);
      }

      let chunkUrlDev: string | undefined;
      if (options?.changedPath) {
        const changedPathAbs = resolve(options.changedPath);
        const changedBasename = basename(changedPathAbs);
        // client.dep.tsx / client.tsx 为客户端入口，非路由组件；HMR 仍下发 routeChunkUrls，由客户端按当前路由 import
        const isClientEntry = changedBasename === CLIENT_DEP_FILENAME ||
          changedBasename === CLIENT_ENTRY_FILENAME;
        /** 配置、公共模块等：在 src 下但不在 routes 下，无单一 chunkUrl；不打 WARN，靠 routeChunkUrls 刷新当前路由 */
        const isWholeClientBundlePath = isClientEntry ||
          isNonRouteSrcUnderAppSrc(routesDirPath, changedPathAbs);
        const componentPath = isWholeClientBundlePath
          ? null
          : getComponentPathFromFilePath(routesDirPath, changedPathAbs);
        if (componentPath) {
          const outputNames = Array.from(outputFilesDev.keys());
          const chunkFileName = getChunkFileNameForComponent(
            componentPath,
            outputNames,
          );
          if (chunkFileName) {
            // 必须与 ROUTE_LOADERS 的解析路径一致：_client.js 在 /_client.js，import("./routes-xxx.js") 解析为 /routes-xxx.js
            // 若用 /_client/routes-xxx.js，则 chunk 内 import("./chunk-xxx.js") 会解析为 /_client/chunk-xxx.js，与正常的 /chunk-xxx.js 不同，导致双实例
            chunkUrlDev = `/${chunkFileName}`;
          } else {
            logger.warn(
              $tr("log.hmrChunkNotFound", {
                path: componentPath,
                files: outputNames.join(", "),
              }),
            );
          }
        } else if (!isWholeClientBundlePath) {
          logger.warn(
            $tr("log.hmrComponentPathNotFound", {
              changedPath: options.changedPath ?? "",
              routesDirPath,
            }),
          );
        }
      }

      const { chunkContentIndex, chunkBaseIndex } = buildChunkIndices(
        outputFilesDev,
      );
      const outputNamesForHmr = Array.from(outputFilesDev.keys());
      const routeChunkUrlsDev = buildRouteChunkUrlMap(
        components,
        outputNamesForHmr,
      );
      result = {
        code: mainCodeDev,
        buildTime: Date.now(),
        outputDir: undefined,
        outputFiles: outputFilesDev,
        chunkContentIndex,
        chunkBaseIndex,
        chunkUrl: chunkUrlDev,
        routeChunkUrls: routeChunkUrlsDev,
      };
    }

    // 缓存结果
    cachedClientScript = result;

    logger.debug($tr("log.clientScriptBuildComplete"));
    return result;
  } catch (error) {
    logger.error($tr("log.clientBuildFailed") + ":", error);

    // 返回一个错误提示脚本（运行时通过 escapeHtml 转义 errorMessage，防止 XSS）
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorScript = `
      (function() {
        function escapeHtml(s) {
          return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
        }
        var errorMessage = ${JSON.stringify(errorMessage)};
        console.error(${
      JSON.stringify($tr("log.clientBuildFailed"))
    } + ":", errorMessage);
        var container = document.getElementById("app");
        if (container) {
          container.innerHTML = '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;"><h1 style="font-size:48px;margin:0;color:#ef4444;">${
      $tr("client.buildError")
    }</h1><pre style="color:#666;margin-top:16px;max-width:80%;overflow:auto;background:#f5f5f5;padding:16px;border-radius:8px;">' + escapeHtml(errorMessage) + '</pre></div>';
        }
      })();
    `;

    return {
      code: errorScript,
      buildTime: Date.now(),
    };
  }
}

/**
 * 递归加载输出目录中的所有 JS 文件到内存
 *
 * @param baseDir 基础目录
 * @param currentDir 当前目录
 * @param files 文件映射（key 使用 basename 便于与请求路径匹配）
 */
async function loadOutputFiles(
  baseDir: string,
  currentDir: string,
  files: Map<string, string>,
): Promise<void> {
  try {
    const entries = await readdir(currentDir);
    for (const entry of entries) {
      const entryPath = join(currentDir, entry.name);

      if (entry.isDirectory) {
        // 递归处理子目录
        await loadOutputFiles(baseDir, entryPath, files);
      } else if (entry.name.endsWith(".js") || entry.name.endsWith(".js.map")) {
        // 读取 JS 文件和 source map
        const content = await readTextFile(entryPath);
        // 使用 basename 作为 key，与请求路径 /chunk-xxx.js 的 fileName 一致
        files.set(entry.name, content);
      }
    }
  } catch {
    // 目录可能不存在
  }
}

/**
 * 获取缓存的客户端脚本
 *
 * @returns 缓存的构建结果，如果没有缓存则返回 null
 */
export function getCachedClientScript(): ClientBuildResult | null {
  return cachedClientScript;
}

/**
 * 清除客户端脚本缓存
 *
 * @param options 可选，disposeBuilder: true 时同时释放增量构建的 context（应用关闭时调用以防内存泄漏）
 */
export async function clearClientScriptCache(options?: {
  disposeBuilder?: boolean;
}): Promise<void> {
  cachedClientScript = null;
  if (options?.disposeBuilder && cachedDevBuilder) {
    await cachedDevBuilder.dispose();
    cachedDevBuilder = null;
  }
}

/** 客户端脚本中间件已拆至 csr-client-middleware.ts，此处保留导出以保持向后兼容 */
export { createClientScriptMiddleware } from "./csr-client-middleware.ts";

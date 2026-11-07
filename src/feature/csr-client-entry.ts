/**
 * CSR 客户端入口生成（从 csr-client-builder 拆出）。
 *
 * 意图：入口／_client.dep 生成与 esbuild 构建编排解耦。
 * 不变量：对外 API 仍由 csr-client-builder 再导出，行为不变。
 *
 * @module
 */

import type { ServiceContainer } from "@dreamer/service";
import {
  basename,
  cwd,
  dirname,
  ensureDir,
  exists,
  getEnv,
  join,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import { CLIENT_ENTRY_FILENAME } from "../utils/constants.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import {
  normalizePathForCompare,
  pathForLog,
  resolveRouterRoutesDirPath,
} from "../utils/path.ts";
import {
  type ClientDepRenderMode,
  generateClientDepContent,
} from "./csr-client-dep.ts";
import {
  getRouteClientManifest,
  type RouteComponentInfo,
} from "./csr-client-route-manifest.ts";

/**
 * 从变更文件路径推导路由 componentPath（如 .../routes/index.tsx -> index）
 * 会统一将路径规范化为绝对路径再比较，避免相对路径与绝对路径不一致导致匹配失败。
 * 特别处理 routesDirPath 中可能存在的 ./（如 basic/./src/routes）与 filePath 不含 ./ 的不一致。
 */
export function getComponentPathFromFilePath(
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
export function isNonRouteSrcUnderAppSrc(
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
export function getHmrCssEntries(container: ServiceContainer): Array<{
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
export const CLIENT_DEP_FILENAME = "_client.dep.tsx";

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
export function generateStaticClientEntry(
  _engine: "react" | "preact" | "view",
  _components: RouteComponentInfo[],
  _hasLayout: boolean,
  _hmrCssEntries: Array<{ url: string; styleId: string }>,
): string {
  return `/**
 * @generated-scaffold by @dreamer/dweb (only written when the file is missing)
 *
 * 本文件存在后不会被框架覆盖，可手动编辑业务钩子。
 * AI: 可改本文件；勿改同目录 "_client.dep.tsx"（每次构建／启动会重生，DO NOT EDIT）。
 *
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
  const clientDepIsDev = getEnv("RUNTIME_ENV") === "dev";
  const has404 = await exists(join(routesDirPath, "_404.tsx"));
  const has500 = await exists(join(routesDirPath, "_500.tsx"));
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    routesDirPath,
    hasLayout,
    hmrCssEntries,
    renderMode,
    routeLayoutKeys,
    clientDepIsDev,
    has404,
    has500,
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
  const clientDepIsDev = getEnv("RUNTIME_ENV") === "dev";
  const has404 = await exists(join(routesDirPath, "_404.tsx"));
  const has500 = await exists(join(routesDirPath, "_500.tsx"));
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    routesDirPath,
    hasLayout,
    hmrCssEntries,
    renderMode,
    routeLayoutKeys,
    clientDepIsDev,
    has404,
    has500,
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

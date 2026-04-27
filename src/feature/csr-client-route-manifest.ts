/**
 * @fileoverview CSR 客户端路由 manifest 收集。
 * 将路由扫描与布局 key 计算从 `csr-client-builder` 拆出，便于测试与复用。
 */

import { createRouter, type Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { cwd, join, readdir, relative } from "../core/runtime-adapter.ts";
import { normalizePathForCompare } from "../utils/path.ts";

/** 路由组件信息 */
export interface RouteComponentInfo {
  /** 组件路径（相对于 routes 目录，如 "index" 或 "user/[id]"） */
  componentPath: string;
  /** 完整文件路径 */
  fullPath: string;
  /** 导入变量名 */
  importName: string;
}

/** 客户端构建需要的路由 manifest。 */
export interface RouteClientManifest {
  components: RouteComponentInfo[];
  hasLayout: boolean;
  routeLayoutKeys: Record<string, string[]>;
}

/** 路由扫描最大深度，防止过深目录导致栈溢出 */
const MAX_ROUTE_SCAN_DEPTH = 10;

/**
 * 根据组件路径生成稳定的导入变量名。
 *
 * @param componentPath 相对 routes 目录的组件路径
 */
export function routeImportName(componentPath: string): string {
  return "Route_" +
    componentPath
      .replace(/\//g, "_")
      .replace(/-/g, "_")
      .replace(/\[/g, "$")
      .replace(/\]/g, "$");
}

/**
 * 将 Router 返回的文件路径归一化成绝对文件路径。
 *
 * @param raw Router route.file / route.fullPath
 * @param routesDirPath routes 目录绝对路径
 */
function normalizeRouteFilePath(raw: string, routesDirPath: string): string {
  if (raw.startsWith("/")) return raw;
  const normalizedRaw = raw.replace(/\\/g, "/").replace(/^\.\//, "");
  const routesDirParts = routesDirPath.replace(/\\/g, "/").split("/")
    .filter(Boolean);
  for (let len = Math.min(routesDirParts.length, 4); len >= 1; len--) {
    const suffix = routesDirParts.slice(-len).join("/");
    if (normalizedRaw.startsWith(`${suffix}/`)) {
      const base = routesDirParts.slice(0, -len).join("/");
      const absolutePrefix = routesDirPath.startsWith("/") ? "/" : "";
      return `${absolutePrefix}${base ? `${base}/` : ""}${normalizedRaw}`;
    }
  }
  const routesDirFromCwd = relative(cwd(), routesDirPath)
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  if (
    normalizedRaw === routesDirFromCwd ||
    normalizedRaw.startsWith(`${routesDirFromCwd}/`)
  ) {
    return join(cwd(), normalizedRaw);
  }
  return join(routesDirPath, normalizedRaw);
}

/**
 * 将绝对文件路径转换为相对 routes 目录的组件路径。
 *
 * Windows + CI：若仅依赖 {@link relative}，在**短名/长名、逐字与常规路径**混用时会退回
 * **带盘符的“绝对”串**，进而把整段 `D:/.../routes/about` 错当成 `componentPath`，
 * 生成 `import("./routes/D:/...")` 在 esbuild 中无法解析。因此先用
 * {@link normalizePathForCompare} 对两端收束，再取 `routes` 之后子路径。
 *
 * @param routeFilePath 路由文件绝对路径
 * @param routesDirPath routes 目录绝对路径
 */
function getRouteComponentPath(
  routeFilePath: string,
  routesDirPath: string,
): string {
  const normRoutes = normalizePathForCompare(routesDirPath);
  const normFile = normalizePathForCompare(routeFilePath);
  if (normFile === normRoutes) {
    return "";
  }
  const nLower = normRoutes.toLowerCase();
  /**
   * 1) 固定长度、大小写不敏感前缀（真实 Windows 上比 `f.startsWith(r+/)` 稳，避免
   * `D:`/逐字/短长名在归一后仍略不一致时首段 `startsWith` 失败，退回整段绝对路径）。
   */
  const n = normRoutes.length;
  if (
    normFile.length > n &&
    normFile[n] === "/" &&
    normFile.slice(0, n).toLowerCase() === nLower
  ) {
    return normFile.slice(n + 1);
  }
  /**
   * 2) 同 {@link getComponentPathFromFilePath}：`includes` + `indexOf`（不假设首字符
   * 在 index 0 上两种归一后字节级对齐）。
   */
  const fLower = normFile.toLowerCase();
  if (fLower.length > 0) {
    const withSlash = fLower.indexOf(nLower + "/");
    if (withSlash === 0) {
      return normFile.slice(nLower.length + 1);
    }
  }
  let rel = relative(routesDirPath, routeFilePath).replace(/\\/g, "/");
  if (rel && /^[A-Za-z]:\//.test(rel) && !rel.startsWith("..")) {
    if (
      normFile.length > n && normFile[n] === "/" &&
      normFile.slice(0, n).toLowerCase() === nLower
    ) {
      rel = normFile.slice(n + 1);
    } else {
      const pos = fLower.indexOf(nLower + "/");
      if (pos === 0) {
        rel = normFile.slice(nLower.length + 1);
      }
    }
  }
  const routesDirParts = routesDirPath.replace(/\\/g, "/").split("/")
    .filter(Boolean);
  for (let len = Math.min(routesDirParts.length, 4); len >= 1; len--) {
    const prefix = routesDirParts.slice(-len).join("/");
    if (rel.length > 0 && rel.startsWith(`${prefix}/`)) {
      rel = rel.slice(prefix.length + 1);
      break;
    }
  }
  return rel;
}

/**
 * 使用 @dreamer/router 扫描路由目录并生成「路由路径 -> 布局 key 链」映射。
 *
 * @param routesDirPath 路由目录绝对路径
 */
export async function getRouteLayoutKeys(routesDirPath: string): Promise<{
  hasLayout: boolean;
  routeLayoutKeys: Record<string, string[]>;
}> {
  const router = createRouter({ routesDir: routesDirPath });
  await router.scan();
  const routeLayoutKeys: Record<string, string[]> = {};
  for (const r of router.getRoutes()) {
    routeLayoutKeys[r.path] = router.getLayoutKeysForPath(r.path);
  }
  const hasLayout = Object.values(routeLayoutKeys).some((arr) =>
    arr.length > 0
  );
  return { hasLayout, routeLayoutKeys };
}

/**
 * 扫描路由目录，获取所有可水合路由组件。
 *
 * @param routesDir 路由目录绝对路径
 * @param basePath 相对路径前缀
 * @param _engine 渲染引擎，保留用于未来扩展
 */
export async function scanRouteComponents(
  routesDir: string,
  basePath = "",
  _engine: "react" | "preact" | "view" = "preact",
): Promise<RouteComponentInfo[]> {
  const components: RouteComponentInfo[] = [];
  /** 客户端懒加载仅注册 JSX 页面；工具 .ts 放在 routes 下也不会误入 _client.dep */
  const extRe = /\.(tsx|jsx)$/;
  const queue: Array<{ dir: string; base: string; depth: number }> = [
    { dir: routesDir, base: basePath, depth: 0 },
  ];

  while (queue.length > 0) {
    const { dir, base, depth } = queue.shift()!;
    if (depth >= MAX_ROUTE_SCAN_DEPTH) continue;

    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const entryPath = join(dir, entry.name);
        if (entry.isDirectory) {
          queue.push({
            dir: entryPath,
            base: base ? `${base}/${entry.name}` : entry.name,
            depth: depth + 1,
          });
        } else if (entry.isFile && extRe.test(entry.name)) {
          const fileName = entry.name.replace(extRe, "");
          if (fileName.startsWith("_")) continue;

          const componentPath = base ? `${base}/${fileName}` : fileName;
          components.push({
            componentPath,
            fullPath: entryPath,
            importName: routeImportName(componentPath),
          });
        }
      }
    } catch {
      // 目录不存在或读取失败，跳过，保持旧行为。
    }
  }

  return components;
}

/**
 * 尝试复用已扫描的 Router 路由表，避免 client build 再次遍历 routes 目录。
 *
 * @param router 已初始化的 Router
 * @param routesDirPath routes 目录绝对路径
 */
export function collectRouteClientManifestFromRouter(
  router: Router,
  routesDirPath: string,
): RouteClientManifest {
  const components: RouteComponentInfo[] = [];
  const routeLayoutKeys: Record<string, string[]> = {};
  const extRe = /\.(tsx|jsx)$/;
  for (const route of router.getRoutes?.() ?? []) {
    routeLayoutKeys[route.path] = router.getLayoutKeysForPath?.(route.path) ??
      [];
    const raw = route.fullPath || route.file || "";
    if (
      route.isApi ||
      route.isSpecial ||
      typeof raw !== "string" ||
      !extRe.test(raw)
    ) {
      continue;
    }
    const routeFilePath = normalizeRouteFilePath(raw, routesDirPath);
    const rel = getRouteComponentPath(routeFilePath, routesDirPath);
    if (rel.startsWith("..")) continue;
    const componentPath = rel.replace(extRe, "");
    if (componentPath.split("/").some((part) => part.startsWith("_"))) {
      continue;
    }
    components.push({
      componentPath,
      fullPath: routeFilePath,
      importName: routeImportName(componentPath),
    });
  }
  return {
    components,
    hasLayout: Object.values(routeLayoutKeys).some((arr) => arr.length > 0),
    routeLayoutKeys,
  };
}

/**
 * 获取客户端构建所需的路由 manifest。优先复用容器内 Router，缺失时回退到文件系统扫描。
 *
 * @param container 服务容器
 * @param routesDirPath routes 目录绝对路径
 * @param engine 渲染引擎
 */
export async function getRouteClientManifest(
  container: ServiceContainer,
  routesDirPath: string,
  engine: "react" | "preact" | "view",
): Promise<RouteClientManifest> {
  if (container.has("router")) {
    const manifest = collectRouteClientManifestFromRouter(
      container.get<Router>("router"),
      routesDirPath,
    );
    if (manifest.components.length > 0) {
      return manifest;
    }
  }

  const components = await scanRouteComponents(routesDirPath, "", engine);
  const { hasLayout, routeLayoutKeys } = await getRouteLayoutKeys(
    routesDirPath,
  );
  return { components, hasLayout, routeLayoutKeys };
}

/**
 * @fileoverview CSR 客户端路由 manifest 收集。
 * 将路由扫描与布局 key 计算从 `csr-client-builder` 拆出，便于测试与复用。
 */

import { createRouter, type Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { cwd, join, readdir, relative } from "../core/runtime-adapter.ts";
import {
  extractComponentPathFromRouteFile,
  normalizePathForCompare,
  normalizePathStringForSubpathExtraction,
} from "../utils/path.ts";

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
 * 在已用 {@link normalizePathForCompare} 收束后的路径上，用「/」段做大小写不敏感前缀
 * 匹配，得到 `routes` 目录之下的子路径。真实 Windows 上经 `resolve` 后，偶发
 * 整段字符串**逐字符**前缀仍与 `routes` 对不齐，但**段**列表一致，此时仅此步可解。
 *
 * @param normFile 归一后的文件路径
 * @param normRoutes 归一后的 routes 目录
 * @returns 相对子路径，若 `normFile` 不落在 `normRoutes` 之下则为 `null`
 */
function getRelativeToRoutesDirBySegments(
  normFile: string,
  normRoutes: string,
): string | null {
  const toSegs = (p: string) => p.split("/").filter((s) => s.length > 0);
  const fSegs = toSegs(normFile);
  const rSegs = toSegs(normRoutes);
  if (fSegs.length < rSegs.length) return null;
  for (let i = 0; i < rSegs.length; i++) {
    if (fSegs[i]!.toLowerCase() !== rSegs[i]!.toLowerCase()) {
      return null;
    }
  }
  if (fSegs.length === rSegs.length) {
    return "";
  }
  return fSegs.slice(rSegs.length).join("/");
}

/**
 * 在**未**调用 `resolve` 的路径上，按「`routes` 目录为父、`file` 为子」从字符串剥子路径。
 *
 * Windows 上 `normalizePathForCompare` 内部的 `resolve` 可能把**同一目录**展成
 * 8.3/逐字/常规等不同形态，导致归一后整串/按段 与 `routes` 均对不齐；而 Router
 * 的 `fullPath` 与当前 `routesDirPath` 往往本为同一套字面母串。故先对只做了
 * 反斜杠→`/` 并剥 Windows 逐字 `//?/` 后再做**定界**前缀：须 `file[routesLen]==="/"`，
 * 避免 `C:/a` 误匹配 `C:/ab/...`；**仅**一端是 `//?/D/...` 时也必须先归一再比。
 *
 * @param routeFilePath 路由文件绝对路径
 * @param routesDirPath routes 目录绝对路径
 * @returns 相对子路径，无法判定为父子关系时返回 `null`
 */
function getRouteComponentPathBeforeResolve(
  routeFilePath: string,
  routesDirPath: string,
): string | null {
  const f = normalizePathStringForSubpathExtraction(routeFilePath);
  const r = normalizePathStringForSubpathExtraction(routesDirPath);
  if (f.length <= r.length) {
    return null;
  }
  if (f[r.length] !== "/") {
    return null;
  }
  if (f.slice(0, r.length).toLowerCase() !== r.toLowerCase()) {
    return null;
  }
  return f.slice(r.length + 1);
}

/**
 * 将绝对文件路径转换为相对 routes 目录的组件路径。
 *
 * Windows + CI：若仅依赖 {@link relative}，在**短名/长名、逐字与常规路径**混用时会退回
 * **带盘符的“绝对”串**，进而把整段 `D:/.../routes/about` 错当成 `componentPath`，
 * 生成 `import("./routes/D:/...")` 在 esbuild 中无法解析。故先尝试
 * {@link getRouteComponentPathBeforeResolve}，再用 {@link normalizePathForCompare} 收束。
 *
 * @param routeFilePath 路由文件绝对路径
 * @param routesDirPath routes 目录绝对路径
 * @param routerRawPath Router 的 `fullPath` 原文（与 `raw` 一致时可为归一后路径），在
 * `join` 结果与原文其一含逐字前缀时多试一次
 */
function getRouteComponentPath(
  routeFilePath: string,
  routesDirPath: string,
  routerRawPath?: string,
): string {
  const beforeCandidates: string[] = [];
  const seen = new Set<string>();
  for (const p of [routeFilePath, routerRawPath]) {
    if (p == null || p === "" || seen.has(p)) {
      continue;
    }
    seen.add(p);
    beforeCandidates.push(p);
  }
  for (const p of beforeCandidates) {
    const rawRel = getRouteComponentPathBeforeResolve(p, routesDirPath);
    if (rawRel !== null) {
      return rawRel;
    }
  }
  const normRoutes = normalizePathForCompare(routesDirPath);
  const normFile = normalizePathForCompare(routeFilePath);
  if (normFile === normRoutes) {
    return "";
  }
  /**
   * 优先按**路径段**剥前缀，避免 Windows 上 resolve 后整串 `startsWith` 仍不成立
   * （与 {@link getRelativeToRoutesDirBySegments} 注释中说明的 CI 问题一致）。
   */
  const bySeg = getRelativeToRoutesDirBySegments(normFile, normRoutes);
  if (bySeg !== null) {
    return bySeg;
  }
  const nLower = normRoutes.toLowerCase();
  /**
   * 1) 固定长度、大小写不敏感前缀（在段匹配失败时仍作补充）。
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
    const rel = getRouteComponentPath(
      routeFilePath,
      routesDirPath,
      String(raw),
    );
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
 * 若 `componentPath` 被误成带盘符的**绝对**串，`_client.dep.tsx` 会生成
 * `import(\"./routes/D:/...")` 导致 esbuild 无法解析。用
 * `fullPath` + `routesDirPath` 在生成入口前再收束一次 key。
 */
function shouldSanitizeComponentKeyForClient(componentPath: string): boolean {
  return /[A-Za-z]:\//.test(componentPath.replace(/\\/g, "/"));
}

/**
 * @param components 已收集的路由项
 * @param routesDirPath routes 目录绝对路径
 */
function sanitizeClientRouteComponents(
  components: RouteComponentInfo[],
  routesDirPath: string,
): RouteComponentInfo[] {
  return components.map((c) => {
    if (!shouldSanitizeComponentKeyForClient(c.componentPath)) {
      return c;
    }
    const fixed = extractComponentPathFromRouteFile(
      routesDirPath,
      c.fullPath,
    );
    if (
      !fixed ||
      fixed === c.componentPath ||
      shouldSanitizeComponentKeyForClient(fixed)
    ) {
      return c;
    }
    return {
      ...c,
      componentPath: fixed,
      importName: routeImportName(fixed),
    };
  });
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
      return {
        ...manifest,
        components: sanitizeClientRouteComponents(
          manifest.components,
          routesDirPath,
        ),
      };
    }
  }

  const components = await scanRouteComponents(routesDirPath, "", engine);
  const { hasLayout, routeLayoutKeys } = await getRouteLayoutKeys(
    routesDirPath,
  );
  return {
    components: sanitizeClientRouteComponents(components, routesDirPath),
    hasLayout,
    routeLayoutKeys,
  };
}

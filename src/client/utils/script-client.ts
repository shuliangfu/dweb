/**
 * 客户端脚本工具函数
 * 用于生成客户端渲染脚本代码
 */

import { filePathToHttpUrl } from "../../common/utils/path.ts";
import { minifyJavaScript } from "../../server/utils/minify.ts";
import { buildFromStdin } from "../../server/utils/esbuild.ts";
import { readDenoJson } from "../../server/utils/file.ts";
import {
  generateScriptPath,
  registerScript,
} from "../../server/utils/script-server.ts";
import * as path from "@std/path";

// 缓存编译后的客户端脚本
let cachedClientScript: string | null = null;

/**
 * 读取文件内容（支持本地文件和 JSR 包）
 * @param relativePath 相对于当前文件的路径
 * @returns 文件内容
 */
async function readFileContent(relativePath: string): Promise<string> {
  const currentUrl = new URL(import.meta.url);

  // 如果是 HTTP/HTTPS URL（JSR 包），使用 fetch
  if (currentUrl.protocol === "http:" || currentUrl.protocol === "https:") {
    // 构建 JSR URL：将当前文件的 URL 替换为相对路径的文件
    const currentPath = currentUrl.pathname;
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf("/"));
    const targetPath = `${currentDir}/${relativePath}`;

    // 构建完整的 JSR URL
    const baseUrl = currentUrl.origin;
    const fullUrl = `${baseUrl}${targetPath}`;

    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`无法从 JSR 包读取文件: ${fullUrl} (${response.status})`);
    }
    return await response.text();
  } else {
    // 本地文件系统，使用 Deno.readTextFile
    const browserScriptPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      relativePath,
    );
    return await Deno.readTextFile(browserScriptPath);
  }
}

/**
 * 编译客户端脚本
 */
async function compileClientScript(): Promise<string> {
  if (cachedClientScript) {
    return cachedClientScript;
  }

  try {
    // 读取浏览器端脚本文件（支持本地文件和 JSR 包）
    const browserScriptContent = await readFileContent("browser-client.ts");

    // 获取文件路径用于错误报告和解析
    const currentUrl = new URL(import.meta.url);
    let browserScriptPath: string;
    let resolveDir: string;
    if (currentUrl.protocol === "http:" || currentUrl.protocol === "https:") {
      // JSR 包：使用 URL 作为路径标识
      const currentPath = currentUrl.pathname;
      const currentDir = currentPath.substring(0, currentPath.lastIndexOf("/"));
      browserScriptPath = `${currentUrl.origin}${currentDir}/browser-client.ts`;
      // 远程环境下无法使用 URL 作为解析目录，使用项目根目录提升解析稳定性
      resolveDir = Deno.cwd();
    } else {
      // 本地文件系统
      browserScriptPath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "browser-client.ts",
      );
      resolveDir = path.dirname(browserScriptPath);
    }

    // 读取项目 import map（如果存在）
    const denoJson = await readDenoJson().catch(() => null);
    const importMap: Record<string, string> =
      (denoJson && typeof denoJson === "object" && denoJson.imports) || {};

    // 强制将 preact 相关包映射到自身，以保持 import("preact") 在编译后不变
    // 这样浏览器端运行时会使用 import map 解析它们
    // @ts-ignore: importMap is treated as Record<string, string>
    importMap["preact"] = "preact";
    // @ts-ignore: importMap is treated as Record<string, string>
    importMap["preact/jsx-runtime"] = "preact/jsx-runtime";

    // 使用统一的构建函数进行客户端打包（替换外部依赖为浏览器 URL）
    const compiledCode = await buildFromStdin(
      browserScriptContent,
      path.basename(browserScriptPath),
      resolveDir,
      "ts",
      {
        importMap,
        cwd: Deno.cwd(),
        bundleClient: true,
        minify: false,
        keepNames: true,
        legalComments: "none",
      },
    );

    // 压缩代码
    const minifiedCode = await minifyJavaScript(compiledCode);
    cachedClientScript = minifiedCode;

    return minifiedCode;
  } catch (error) {
    console.error("[Client Script] 编译客户端脚本失败:", error);
    // 如果编译失败，返回空字符串
    return "";
  }
}

// 注意：不再需要链接拦截器，因为 preact-router 会自动处理链接点击

/**
 * 创建客户端 JS 脚本
 * @param routePath 路由路径（用于动态导入）
 * @param renderMode 渲染模式
 * @param props 页面 props
 * @param shouldHydrate 是否启用 hydration
 * @param layoutPath 布局文件路径（可选）
 * @param basePath 应用基础路径（可选）
 * @param allLayoutPaths 所有布局路径数组（可选）
 * @param layoutDisabled 是否禁用布局（可选）
 * @param prefetchRoutes 需要预加载的路由数组（可选）
 * @param prefetchLoading 是否在预加载时显示全屏加载状态（可选）
 * @param prefetchMode 预加载模式：single（逐个请求每个路由的组件）或 batch（一次请求，服务端打包返回所有匹配路由的数据，默认）（可选）
 * @returns 客户端脚本 HTML
 */
export async function createClientScript(
  routePath: string,
  renderMode: "ssr" | "csr" | "hybrid",
  props: Record<string, unknown>,
  shouldHydrate: boolean = false,
  layoutPath?: string | null,
  basePath?: string,
  allLayoutPaths?: string[] | null,
  layoutDisabled: boolean = false,
  prefetchRoutes?: string[],
  prefetchLoading: boolean = false,
  prefetchMode: "single" | "batch" = "batch",
  layoutData?: Record<string, unknown>[] | null,
): Promise<string> {
  // 将文件路径转换为 HTTP URL
  const httpUrl = filePathToHttpUrl(routePath);

  // 提取 metadata（如果存在），并从 props 中移除，避免重复和潜在问题
  const metadata = (props as any)?.metadata || null;
  const propsWithoutMetadata = { ...props };
  if ("metadata" in propsWithoutMetadata) {
    delete (propsWithoutMetadata as any).metadata;
  }

  // 处理 basePath（多应用模式使用）
  const appBasePath = basePath || "/";

  // 准备布局路径（转换为 HTTP URL）
  let layoutHttpUrl: string | null = null;
  if (layoutPath) {
    const layoutFileUrl = layoutPath.startsWith("file://")
      ? layoutPath
      : `file://${layoutPath}`;
    layoutHttpUrl = filePathToHttpUrl(layoutFileUrl);
  }

  // 准备所有布局路径（转换为 HTTP URL 数组）
  let allLayoutHttpUrls: string[] | null = null;
  if (
    allLayoutPaths && Array.isArray(allLayoutPaths) && allLayoutPaths.length > 0
  ) {
    allLayoutHttpUrls = allLayoutPaths.map((p: string) => {
      const layoutFileUrl = p.startsWith("file://") ? p : `file://${p}`;
      return filePathToHttpUrl(layoutFileUrl);
    });
  }

  try {
    // 编译客户端脚本
    const clientScript = await compileClientScript();
    if (!clientScript) {
      console.warn("[Client Script] 客户端脚本编译失败，跳过注入");
      return "";
    }

    // 生成页面数据 JSON（用于客户端路由导航时提取）
    const pageData = {
      route: httpUrl,
      renderMode,
      props: propsWithoutMetadata,
      shouldHydrate,
      layoutPath: layoutHttpUrl,
      allLayoutPaths: allLayoutHttpUrls,
      basePath: appBasePath,
      metadata,
      layout: layoutDisabled ? false : undefined,
      prefetchRoutes: prefetchRoutes || undefined,
      prefetchLoading: prefetchLoading || undefined,
      prefetchMode: prefetchMode || undefined,
      layoutData: layoutData || undefined, // 布局的 load 数据
    };

    // 转义 JSON 中的 HTML 特殊字符，防止 XSS
    const pageDataJson = JSON.stringify(pageData)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e");

    // 生成初始化脚本（从 JSON script 标签读取数据）
    const initScript = `
// 初始化客户端
initClient(${pageDataJson});
`;

    // 组合完整的脚本
    const fullScript = `${clientScript}\n${initScript}`;

    // 注册脚本到脚本服务并生成 script 标签
    const scriptPath = generateScriptPath("client");
    registerScript(scriptPath, fullScript);

    // 返回：JSON script 标签 + 模块化的渲染代码（使用 script 标签引用）
    if (renderMode === "ssr") {
      return `<script type="application/json" data-type="dweb-page-data">${pageDataJson};</script>`;
    }
    return `<script type="application/json" data-type="dweb-page-data">${pageDataJson};</script>\n<script type="module" src="${scriptPath}"></script>`;
  } catch (error) {
    console.error("[Client Script] 创建客户端脚本时出错:", error);
    return "";
  }
}

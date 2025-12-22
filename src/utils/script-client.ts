/**
 * 客户端脚本工具函数
 * 用于生成客户端渲染脚本代码
 */

import { filePathToHttpUrl } from "./path.ts";
import { minifyJavaScript } from "./minify.ts";
import { compileWithEsbuild } from "./module.ts";
import * as path from "@std/path";

// 缓存编译后的客户端脚本
let cachedClientScript: string | null = null;

/**
 * 编译客户端脚本
 */
async function compileClientScript(): Promise<string> {
  if (cachedClientScript) {
    return cachedClientScript;
  }

  try {
    // 读取浏览器端脚本文件
    const browserScriptPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "browser-client.ts",
    );
    const browserScriptContent = await Deno.readTextFile(browserScriptPath);

    // 使用 esbuild 编译 TypeScript 为 JavaScript
    const compiledCode = await compileWithEsbuild(
      browserScriptContent,
      browserScriptPath,
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

    // 返回：JSON script 标签 + 模块化的渲染代码
    return `<script type="application/json" data-type="dweb-page-data">${pageDataJson};</script>\n<script type="module" data-type="client">${fullScript}</script>`;
  } catch (error) {
    console.error("[Client Script] 创建客户端脚本时出错:", error);
    return "";
  }
}

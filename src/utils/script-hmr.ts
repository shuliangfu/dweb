/**
 * HMR 客户端脚本工具函数
 * 用于生成 HMR 客户端脚本代码
 */

import { minifyJavaScript } from "./minify.ts";
import { compileWithEsbuild } from "./module.ts";
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
  if (currentUrl.protocol === 'http:' || currentUrl.protocol === 'https:') {
    // 构建 JSR URL：将当前文件的 URL 替换为相对路径的文件
    const currentPath = currentUrl.pathname;
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
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
 * 编译客户端 HMR 脚本
 */
async function compileClientScript(): Promise<string> {
  if (cachedClientScript) {
    return cachedClientScript;
  }

  try {
    // 读取浏览器端脚本文件（支持本地文件和 JSR 包）
    const browserScriptContent = await readFileContent("browser-hmr.ts");
    
    // 获取文件路径用于 esbuild（用于错误报告）
    const currentUrl = new URL(import.meta.url);
    let browserScriptPath: string;
    if (currentUrl.protocol === 'http:' || currentUrl.protocol === 'https:') {
      // JSR 包：使用 URL 作为路径标识
      const currentPath = currentUrl.pathname;
      const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
      browserScriptPath = `${currentUrl.origin}${currentDir}/browser-hmr.ts`;
    } else {
      // 本地文件系统
      browserScriptPath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "browser-hmr.ts",
      );
    }

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
    console.error("[HMR] 编译客户端脚本失败:", error);
    // 如果编译失败，返回空字符串
    return "";
  }
}

/**
 * 生成 HMR 初始化脚本（包含配置）
 */
function generateInitScript(hmrPort: number): string {
  return `initHMR(${JSON.stringify({ hmrPort })});`;
}

/**
 * 创建 HMR 客户端脚本（带 script 标签）
 * @param hmrPort HMR 服务器端口
 * @returns HMR 客户端脚本 HTML
 */
export async function createHMRClientScript(hmrPort: number): Promise<string> {
  try {
    // 编译客户端脚本
    const clientScript = await compileClientScript();
    if (!clientScript) {
      console.warn("[HMR] 客户端脚本编译失败，跳过注入");
      return "";
    }

    // 生成初始化脚本
    const initScript = generateInitScript(hmrPort);

    // 组合完整的脚本
    const fullScript = `${clientScript}\n${initScript}`;

    return `<script type="module" data-type="dweb-hmr">${fullScript}</script>`;
  } catch (error) {
    console.error("[HMR] 创建客户端脚本时出错:", error);
    return "";
  }
}


/**
 * Esbuild 工具函数
 * 统一管理所有 esbuild 相关的配置和插件
 */

import * as esbuild from "esbuild";
import * as path from "@std/path";
import { getExternalPackages } from "./module.ts";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.0";

// 调试模式：直接输出日志

/**
 * @dreamer/dweb 包的客户端 exports 映射表
 * 只包含客户端可能使用的路径，服务端路径（如 /cli、/init、/console、/database）不需要映射
 */
const DREAMER_DWEB_EXPORTS: Record<string, string> = {
  "./client": "src/client.ts",
  "./extensions": "src/extensions/mod.ts",
  // extensions 的子路径通过动态解析处理，不需要全部列出
  // 如果遇到 ./extensions/* 路径，会动态构建路径
};

/**
 * 将 jsr: 协议转换为浏览器可访问的 HTTP URL
 * JSR.io 会自动编译 TypeScript 文件，浏览器请求 .ts 文件时会返回编译后的 JavaScript
 * @param jsrUrl jsr: 协议的 URL，例如：jsr:@dreamer/dweb@^1.8.2/client
 * @returns 浏览器可访问的 HTTP URL，例如：https://jsr.io/@dreamer/dweb/1.8.2/src/client.ts
 */
/**
 * 将 jsr: 协议转换为浏览器可访问的 URL（使用代理路径）
 * 与 import-map.ts 中的 convertJsrToBrowserUrl 保持一致，使用代理路径
 * @param jsrUrl jsr: 协议的 URL，例如：jsr:@dreamer/dweb@^1.8.2/client
 * @returns 浏览器可访问的代理路径，例如：/__jsr/@dreamer/dweb/1.8.2/src/client.ts
 */
function convertJsrToHttpUrl(jsrUrl: string): string {
  // 移除 jsr: 前缀
  const jsrPath = jsrUrl.replace(/^jsr:/, "");
  
  // 匹配格式：@scope/package@version 或 @scope/package@version/subpath
  // 版本号可能包含 ^、~ 等符号，以及预发布版本号（如 -beta.2、-alpha.1、-rc.1）
  const jsrMatch = jsrPath.match(/^@([\w-]+)\/([\w-]+)@([\^~]?[\d.]+(?:-[\w.]+)?)(?:\/(.+))?$/);
  
  if (!jsrMatch) {
    // 如果无法匹配，返回原始 URL（让浏览器报错，便于调试）
    return jsrUrl;
  }
  
  const [, scope, packageName, versionWithPrefix, subPath] = jsrMatch;
  
  // 移除版本号前缀（^ 或 ~），只保留版本号本身
  const version = versionWithPrefix.replace(/^[\^~]/, "");
  
  // 构建 JSR HTTP URL
  // JSR URL 格式：https://jsr.io/@scope/package/version/path
  // JSR.io 会自动编译 TypeScript 文件，浏览器请求 .ts 文件时会返回编译后的 JavaScript
  if (subPath) {
    // 有子路径，需要根据 exports 映射到实际文件路径
    let actualPath: string;
    
    // 对于 @dreamer/dweb 包，使用 exports 映射表
    if (scope === "dreamer" && packageName === "dweb") {
      const exportKey = `./${subPath}`;
      if (exportKey in DREAMER_DWEB_EXPORTS) {
        // 根据 exports 映射到实际文件路径
        actualPath = DREAMER_DWEB_EXPORTS[exportKey];
      } else if (subPath.startsWith("extensions/")) {
        // 处理 extensions 的子路径（如 extensions/validation -> src/extensions/helpers/validation.ts）
        const extensionSubPath = subPath.substring("extensions/".length);
        // 根据常见的 extensions 子路径模式构建路径
        // extensions/validation -> src/extensions/helpers/validation.ts
        actualPath = `src/extensions/helpers/${extensionSubPath}.ts`;
      } else {
        // 如果 exports 中没有，尝试直接使用子路径
        // 确保路径以 / 开头
        const normalizedSubPath = subPath.startsWith("/") ? subPath : `/${subPath}`;
        // 如果子路径没有扩展名，尝试添加 .ts
        if (!normalizedSubPath.match(/\.(ts|tsx|js|jsx)$/)) {
          actualPath = `${normalizedSubPath}.ts`;
        } else {
          actualPath = normalizedSubPath;
        }
      }
    } else {
      // 对于其他 JSR 包，直接使用子路径
      // 注意：理想情况下应该从 JSR 包的 deno.json 读取 exports 字段来映射子路径
      // 但目前实现中，我们假设子路径就是实际的文件路径
      // 如果子路径没有扩展名，尝试添加 .ts（JSR 包的标准做法）
      const normalizedSubPath = subPath.startsWith("/") ? subPath : `/${subPath}`;
      if (!normalizedSubPath.match(/\.(ts|tsx|js|jsx)$/)) {
        actualPath = `${normalizedSubPath}.ts`;
      } else {
        actualPath = normalizedSubPath;
      }
    }
    
    // 确保路径以 / 开头
    if (!actualPath.startsWith("/")) {
      actualPath = `/${actualPath}`;
    }
    
    // 使用代理路径，与 import-map.ts 中的 convertJsrToBrowserUrl 保持一致
    return `/__jsr/@${scope}/${packageName}/${version}${actualPath}`;
  } else {
    // 没有子路径，指向包的 mod.ts（JSR 包的标准入口文件）
    // 使用代理路径
    return `/__jsr/@${scope}/${packageName}/${version}/mod.ts`;
  }
}

/**
 * 创建 JSR 解析插件
 * 处理 JSR URL、npm 子路径、路径别名等
 * @param importMap import map 配置
 * @param cwd 当前工作目录
 * @param externalPackages 外部依赖包列表
 * @returns esbuild 插件
 */
export function createJSRResolverPlugin(
  importMap: Record<string, string>,
  cwd: string,
  externalPackages: string[],
): esbuild.Plugin {
  return {
    name: "jsr-resolver",
    setup(build: esbuild.PluginBuild) {
      // 处理路径别名（以 / 结尾的别名，如 @store/、@components/）
      // 必须在其他处理器之前执行，确保能拦截到路径别名导入
      build.onResolve({ filter: /^@[^/]+\// }, async (args) => {
        // 查找匹配的路径别名（以 / 结尾的 import map 条目）
        for (const [aliasKey, aliasValue] of Object.entries(importMap)) {
          // 检查是否是路径别名（以 / 结尾）
          if (aliasKey.endsWith("/") && args.path.startsWith(aliasKey)) {
            // 提取子路径（如 "@store/something" -> "something"）
            const subPath = args.path.substring(aliasKey.length);
            // 构建完整路径（如 "./stores/" + "something" -> "./stores/something"）
            const fullPath = aliasValue + subPath;
            
            // 手动解析路径（相对于项目根目录 cwd）
            // 注意：不能使用 import.meta.resolve，因为它在 esbuild 插件中使用的是框架的上下文
            try {
              // 将相对路径解析为绝对路径
              const resolvedPath = path.isAbsolute(fullPath)
                ? fullPath
                : path.resolve(cwd, fullPath);
              
              // 检查文件是否存在
              try {
                await Deno.stat(resolvedPath);
              } catch {
                // 如果文件不存在，尝试添加 .ts 或 .tsx 扩展名
                const ext = path.extname(resolvedPath);
                if (!ext || ext === "") {
                  // 尝试 .tsx
                  const tsxPath = `${resolvedPath}.tsx`;
                  try {
                    await Deno.stat(tsxPath);
                    return { path: tsxPath };
                  } catch {
                    // 尝试 .ts
                    const tsPath = `${resolvedPath}.ts`;
                    try {
                      await Deno.stat(tsPath);
                      return { path: tsPath };
                    } catch {
                      // 文件不存在，返回错误
                      return {
                        errors: [{
                          text: `Path alias file not found: "${args.path}" (${aliasKey} -> ${aliasValue}${subPath})`,
                        }],
                      };
                    }
                  }
                }
                // 文件不存在，返回错误
                return {
                  errors: [{
                    text: `Path alias file not found: "${args.path}" (${aliasKey} -> ${aliasValue}${subPath})`,
                  }],
                };
              }
              
              // 返回解析后的路径
              return {
                path: resolvedPath,
              };
            } catch (error) {
              // 如果解析失败，返回错误
              return {
                errors: [{
                  text: `Failed to resolve path alias "${args.path}" (${aliasKey} -> ${aliasValue}): ${error instanceof Error ? error.message : String(error)}`,
                }],
              };
            }
          }
        }
        // 如果没有匹配的路径别名，返回 undefined 让其他处理器处理
        return undefined;
      });

      // 处理子路径导入（如 chart/auto）
      // 只有当父包在 external 列表中时，才将子路径标记为 external
      // 如果父包不在 external 列表中，子路径应该被打包（即使它在 import map 中）
      // 必须在 @dreamer/dweb/client 处理之前执行，但使用更具体的过滤器避免冲突
      build.onResolve({ filter: /^[^@./].*\/.*/ }, async (args) => {
        // 检查是否是子路径导入（包含 / 但不是相对路径，也不是 @ 开头的）
        if (args.path.includes("/") && !args.path.startsWith(".") && !args.path.startsWith("/") && !args.path.startsWith("@")) {
          // 提取父包名（如 "chart/auto" -> "chart"）
          const parentPackage = args.path.split("/")[0];
          // 只有当父包在 external 列表中时，才将子路径标记为 external
          // 如果父包不在 external 列表中，子路径应该被打包
          if (externalPackages.includes(parentPackage)) {
            return {
              path: args.path,
              external: true,
            };
          }
          // 如果父包不在 external 列表中，检查父包是否是 npm/jsr/http 导入
          // 如果是，子路径也应该标记为 external，通过网络访问，不打包
          // 从 import map 中查找父包的映射
          const parentImport = importMap[parentPackage];
          if (parentImport) {
            // 如果父包是 npm:、jsr: 或 http: 导入，子路径应该标记为 external
            // 这些依赖应该通过网络访问，不应该被打包
            if (
              parentImport.startsWith("npm:") ||
              parentImport.startsWith("jsr:") ||
              parentImport.startsWith("http://") ||
              parentImport.startsWith("https://")
            ) {
              // 子路径也应该通过网络访问，标记为 external
              return {
                path: args.path,
                external: true,
              };
            }
            
            // 如果父包是本地路径，需要解析子路径以便打包
            // 使用 Deno 的 import.meta.resolve 来解析路径
            try {
              const resolved = await import.meta.resolve(args.path);
              // 将 file:// URL 转换为绝对路径
              let resolvedPath: string;
              if (resolved.startsWith("file://")) {
                const url = new URL(resolved);
                resolvedPath = url.pathname;
              } else {
                resolvedPath = resolved;
              }
              // 如果解析成功，返回解析后的路径
              return {
                path: resolvedPath,
              };
            } catch (error) {
              // 如果解析失败，返回错误
              return {
                errors: [{
                  text: `Failed to resolve subpath "${args.path}" from parent package "${parentPackage}": ${error instanceof Error ? error.message : String(error)}`,
                }],
              };
            }
          }
          // 如果父包不在 import map 中，返回 undefined，让 esbuild 处理
        }
        return undefined; // 让其他处理器处理
      });

      // 处理 @ 开头的子路径导入（如 @scope/package/subpath）
      // 排除 @dreamer/dweb/client，因为它有专门的处理逻辑
      build.onResolve({ filter: /^@[^/]+\/[^/]+\/.+/ }, (args) => {
        // 排除 @dreamer/dweb/client，它有专门的处理逻辑
        if (args.path === "@dreamer/dweb/client") {
          return undefined;
        }
        
        // 特别处理 @dreamer/dweb/* 的其他子路径
        // 如果是 JSR URL，转换为 HTTP URL 后标记为 external，通过网络请求加载
        if (args.path.startsWith("@dreamer/dweb/")) {
          const parentPackage = "@dreamer/dweb";
          const parentImport = importMap[parentPackage];
          // 如果父包是 JSR URL，构建子路径的 JSR URL 并转换为 HTTP URL
          if (parentImport && parentImport.startsWith("jsr:")) {
            // 提取子路径（如 "@dreamer/dweb/console" -> "console"）
            const subPath = args.path.substring("@dreamer/dweb/".length);
            // 构建完整的 JSR URL
            const jsrUrl = `${parentImport}/${subPath}`;
              // 转换为 HTTP URL
              const httpUrl = convertJsrToHttpUrl(jsrUrl);
              return {
                path: httpUrl,
                external: true,
              };
            }
          }
        
        // 首先检查子路径本身是否在 import map 中（如 "@scope/package/subpath"）
        // 如果子路径本身在 import map 中，检查是否需要转换
        if (args.path in importMap) {
          const importValue = importMap[args.path];
          // 如果是 JSR URL，转换为 HTTP URL
          if (importValue.startsWith("jsr:")) {
            const httpUrl = convertJsrToHttpUrl(importValue);
            return {
              path: httpUrl,
              external: true,
            };
          }
          // 如果是 npm URL，也需要转换
          if (importValue.startsWith("npm:")) {
            // npm URL 应该已经在 import map 生成时转换了，但为了安全起见，这里也处理一下
            // 实际上，npm URL 的转换应该在 import map 生成时完成
            return {
              path: args.path,
              external: true,
            };
          }
          // 其他情况（HTTP URL 或本地路径），直接标记为 external
          return {
            path: args.path,
            external: true,
          };
        }
        
        // 提取父包名（如 "@scope/package/subpath" -> "@scope/package"）
        const parts = args.path.split("/");
        if (parts.length >= 3) {
          const parentPackage = `${parts[0]}/${parts[1]}`;
          // 如果父包在 external 列表中，检查是否需要转换
          if (externalPackages.includes(parentPackage)) {
            // 检查父包在 import map 中的值
            if (parentPackage in importMap) {
              const parentImport = importMap[parentPackage];
            // 如果父包是 JSR URL，需要转换为 HTTP URL
            if (parentImport.startsWith("jsr:")) {
              // 构建完整的 JSR URL（如 jsr:@scope/package@version/subpath）
              const subPath = args.path.substring(parentPackage.length + 1);
              const jsrUrl = `${parentImport}/${subPath}`;
              // 转换为 HTTP URL
              const httpUrl = convertJsrToHttpUrl(jsrUrl);
              return {
                path: httpUrl,
                external: true,
              };
            }
            }
            // 其他情况，直接标记为 external
            return {
              path: args.path,
              external: true,
            };
          }
          // 如果父包在 import map 中（npm/jsr/http），子路径也应该标记为 external
          // 因为浏览器会通过 import map 来解析，esbuild 无法打包 npm/jsr 包的子路径
          if (parentPackage in importMap) {
            const parentImport = importMap[parentPackage];
            // 如果父包是 JSR URL，需要转换为 HTTP URL
            if (parentImport.startsWith("jsr:")) {
              // 构建完整的 JSR URL（如 jsr:@scope/package@version/subpath）
              const subPath = args.path.substring(parentPackage.length + 1);
              const jsrUrl = `${parentImport}/${subPath}`;
              // 转换为 HTTP URL
              const httpUrl = convertJsrToHttpUrl(jsrUrl);
              return {
                path: httpUrl,
                external: true,
              };
            }
            // 如果父包是 npm URL 或 HTTP URL，子路径也应该标记为 external
            if (parentImport.startsWith("npm:") || parentImport.startsWith("http")) {
              return {
                path: args.path,
                external: true,
              };
            }
          }
        }
        return undefined; // 让其他处理器处理
      });

      // 解析 @dreamer/dweb/client（支持 JSR URL 和本地路径）
      // 必须在所有其他解析器之前执行，确保能拦截到导入
      // 使用 onStart 确保插件优先级最高
      build.onStart(() => {
        // 确保插件在解析阶段之前执行
      });
      
      // 处理直接使用 JSR URL 的情况（如 jsr:@dreamer/dweb@^1.8.2-beta.3/client）
      build.onResolve({ filter: /^jsr:/ }, (args) => {
        // 如果是 JSR URL，转换为代理路径后标记为 external
        if (args.path.startsWith("jsr:")) {
          // 先检查 import map 中是否已经有转换后的 URL（代理路径）
          if (args.path in importMap) {
            const mappedUrl = importMap[args.path];
            // 如果已经是代理路径或 HTTP URL，直接使用
            if (mappedUrl.startsWith("/__jsr/") || mappedUrl.startsWith("http")) {
              return {
                path: mappedUrl,
                external: true,
              };
            }
          }
          
          // 如果没有在 import map 中找到，使用转换函数生成代理路径
          const proxyUrl = convertJsrToHttpUrl(args.path);
          return {
            path: proxyUrl,
            external: true,
          };
        }
        return undefined;
      });

      // 处理 @dreamer/dweb/client（必须在其他处理器之前，确保优先级最高）
      build.onResolve({ filter: /^@dreamer\/dweb\/client$/ }, (args) => {
        let clientImport = importMap["@dreamer/dweb/client"];
        
        // 如果没有显式配置 @dreamer/dweb/client，尝试从 @dreamer/dweb 推断
        if (!clientImport) {
          const mainImport = importMap["@dreamer/dweb"];
          if (mainImport) {
            // 从主包配置推断 client 路径
            if (mainImport.startsWith("jsr:")) {
              // JSR URL: jsr:@dreamer/dweb@^1.6.9 -> jsr:@dreamer/dweb@^1.6.9/client
              clientImport = `${mainImport}/client`;
            } else if (mainImport.includes("/mod.ts")) {
              // 本地路径: ./src/mod.ts -> ./src/client.ts
              clientImport = mainImport.replace("/mod.ts", "/client.ts");
            } else if (mainImport.endsWith(".ts")) {
              // 本地路径: ./src/mod.ts -> ./src/client.ts
              const basePath = mainImport.substring(0, mainImport.lastIndexOf("/"));
              clientImport = `${basePath}/client.ts`;
            }
          }
        }
        
        if (!clientImport) {
          return undefined; // 让 esbuild 使用默认解析
        }

        // 如果是 JSR URL，转换为代理路径后标记为 external，不打包，通过网络请求加载
        if (clientImport.startsWith("jsr:")) {
          // 将 JSR URL 转换为浏览器可访问的代理路径（/__jsr/）
          const proxyUrl = convertJsrToHttpUrl(clientImport);
          // 标记为 external，浏览器会通过开发服务器代理请求
          // 注意：即使 @dreamer/dweb/client 在 externalPackages 列表中，
          // 插件返回的 path 会覆盖 esbuild 的默认行为，输出代码中会使用代理路径
          return {
            path: proxyUrl,
            external: true,
          };
        }
        
        // 如果已经是代理路径（/__jsr/）或 HTTP URL，直接使用
        if (clientImport.startsWith("/__jsr/") || clientImport.startsWith("http")) {
          return {
            path: clientImport,
            external: true,
          };
        }

        // 如果是本地路径，解析为绝对路径并打包
        if (!clientImport.startsWith("http")) {
          const resolvedPath = path.isAbsolute(clientImport)
            ? clientImport
            : path.resolve(cwd, clientImport);
          return {
            path: resolvedPath,
            external: false, // 明确标记为不 external，强制打包
          };
        }
        
        return undefined; // 不是 JSR URL，使用默认解析
      });

      // 处理相对路径导入（从 http-url namespace 中的模块）
      build.onResolve({ filter: /^\.\.?\/.*/, namespace: "http-url" }, (args) => {
        try {
          // 解析相对路径为完整的 JSR URL
          const baseUrl = new URL(args.importer);
          const relativePath = args.path;
          const resolvedUrl = new URL(relativePath, baseUrl).href;
          
          return {
            path: resolvedUrl,
            namespace: "http-url",
          };
        } catch (error) {
          return {
            errors: [{
              text: `Failed to resolve relative path: ${args.path} (${error instanceof Error ? error.message : String(error)})`,
            }],
          };
        }
      });

      // 加载 HTTP URL 内容
      build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
        try {
          const response = await fetch(args.path);
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${args.path} (${response.status})`);
          }
          const contents = await response.text();
          return {
            contents,
            loader: "ts",
          };
        } catch (error) {
          return {
            errors: [{
              text: error instanceof Error ? error.message : String(error),
            }],
          };
        }
      });
    },
  };
}

/**
 * 构建 alias 配置
 * 从 import map 中提取本地路径别名，排除 npm/jsr/http 导入和路径别名
 * @param importMap import map 配置
 * @param cwd 当前工作目录
 * @returns esbuild alias 配置对象
 */
export function buildAliasConfig(
  importMap: Record<string, string>,
  cwd: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(importMap)
      .filter(
        ([key, value]) =>
          // 排除所有 @dreamer/dweb 相关的导入（由插件处理或保持为外部依赖）
          !key.startsWith("@dreamer/dweb") &&
          // 排除路径别名（以 / 结尾），由插件处理
          !key.endsWith("/") &&
          !value.startsWith("jsr:") &&
          !value.startsWith("npm:") &&
          !value.startsWith("http"),
      )
      .map(([key, value]) => [key, path.resolve(cwd, value)]),
  );
}

/**
 * 共用的 esbuild 基础配置
 */
export interface EsbuildBaseConfig {
  format: "esm";
  target: "esnext";
  jsx: "automatic";
  jsxImportSource: "preact";
  bundle: boolean;
  treeShaking: boolean;
  write: false;
}

/**
 * 获取共用的 esbuild 基础配置
 * @param options 可选的配置覆盖
 * @returns esbuild 基础配置对象
 */
export function getBaseConfig(
  options: Partial<EsbuildBaseConfig> = {},
): EsbuildBaseConfig {
  return {
    format: "esm",
    target: "esnext",
    jsx: "automatic",
    jsxImportSource: "preact",
    bundle: true,
    treeShaking: true,
    write: false,
    ...options,
  };
}

/**
 * 构建选项接口
 */
export interface BuildOptions {
  /** import map 配置 */
  importMap: Record<string, string>;
  /** 当前工作目录 */
  cwd: string;
  /** 是否打包客户端依赖（默认 false） */
  bundleClient?: boolean;
  /** 是否压缩代码（默认 false，开发环境） */
  minify?: boolean;
  /** 是否生成 sourcemap（默认 false） */
  sourcemap?: boolean;
  /** 是否保留名称（默认 false） */
  keepNames?: boolean;
  /** 是否移除注释（默认 true） */
  legalComments?: "none" | "inline" | "eof" | "external";
  /** 外部依赖包列表（可选，如果不提供则自动从 importMap 生成） */
  externalPackages?: string[];
  /** 额外的插件列表（可选） */
  plugins?: esbuild.Plugin[];
}

/**
 * 使用 stdin 构建（从代码内容构建）
 * @param code 源代码内容
 * @param sourcefile 源文件名（用于错误报告）
 * @param resolveDir 解析目录（用于解析相对路径导入）
 * @param loader 文件类型（ts 或 tsx）
 * @param options 构建选项
 * @returns 编译后的代码
 */
export async function buildFromStdin(
  code: string,
  sourcefile: string,
  resolveDir: string,
  loader: "ts" | "tsx",
  options: BuildOptions,
): Promise<string> {
  const {
    importMap,
    cwd,
    bundleClient = false,
    minify = false,
    sourcemap = false,
    keepNames = false,
    legalComments = "none",
    externalPackages,
    plugins = [],
  } = options;

  // 如果没有提供外部依赖列表，自动生成
  const finalExternalPackages = externalPackages ??
    getExternalPackages(importMap, bundleClient, false);

  // 创建 JSR 解析插件
  const jsrResolverPlugin = createJSRResolverPlugin(
    importMap,
    cwd,
    finalExternalPackages,
  );

  // 使用 @luca/esbuild-deno-loader 插件处理 Deno 特有的模块解析（jsr:、npm: 等）
  // 这个插件会自动处理 JSR 和 npm 包的解析，但我们仍然保留自定义插件以处理特殊逻辑
  // 注意：denoPlugins 需要一个纯 import map（只包含 imports 和 scopes），
  // 但 deno.json 包含其他字段，所以我们需要创建一个临时的 import map 文件
  // 或者不传递 importMapURL，让插件从代码中自动解析
  // 我们选择不传递 importMapURL，因为我们已经有了 importMap 参数，自定义插件会处理
  const denoLoaderPlugins = denoPlugins();

  // 构建 alias 配置
  const alias = buildAliasConfig(importMap, cwd);

  // 执行构建
  // 注意：denoPlugins 应该放在最前面，因为它处理基础的模块解析
  // 我们的自定义插件放在后面，处理特殊逻辑（如路径别名、@dreamer/dweb/client 等）
  const result = await esbuild.build({
    stdin: {
      contents: code,
      sourcefile,
      resolveDir,
      loader,
    },
    ...getBaseConfig(),
    minify,
    sourcemap,
    keepNames,
    legalComments,
    external: finalExternalPackages,
    plugins: [...denoLoaderPlugins, jsrResolverPlugin, ...plugins],
    alias,
  });

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error("esbuild 打包结果为空");
  }

  return result.outputFiles[0].text;
}

/**
 * 使用入口文件构建
 * @param entryPoints 入口文件路径数组
 * @param options 构建选项
 * @returns esbuild 构建结果
 */
export async function buildFromEntryPoints(
  entryPoints: string[],
  options: BuildOptions & {
    /** 输出目录（代码分割时需要） */
    outdir?: string;
    /** 输出基础目录（代码分割时需要） */
    outbase?: string;
    /** 是否启用代码分割（默认 false） */
    splitting?: boolean;
  },
): Promise<esbuild.BuildResult> {
  const {
    importMap,
    cwd,
    bundleClient = false,
    minify = false,
    sourcemap = false,
    keepNames = false,
    legalComments = "none",
    externalPackages,
    plugins = [],
    outdir,
    outbase,
    splitting = false,
  } = options;

  // 如果没有提供外部依赖列表，自动生成
  const finalExternalPackages = externalPackages ??
    getExternalPackages(importMap, bundleClient, false);

  // 创建 JSR 解析插件
  const jsrResolverPlugin = createJSRResolverPlugin(
    importMap,
    cwd,
    finalExternalPackages,
  );

  // 使用 @luca/esbuild-deno-loader 插件处理 Deno 特有的模块解析（jsr:、npm: 等）
  // 这个插件会自动处理 JSR 和 npm 包的解析，但我们仍然保留自定义插件以处理特殊逻辑
  // 注意：denoPlugins 需要一个纯 import map（只包含 imports 和 scopes），
  // 但 deno.json 包含其他字段，所以我们需要创建一个临时的 import map 文件
  // 或者不传递 importMapURL，让插件从代码中自动解析
  // 我们选择不传递 importMapURL，因为我们已经有了 importMap 参数，自定义插件会处理
  const denoLoaderPlugins = denoPlugins();

  // 构建 alias 配置
  const alias = buildAliasConfig(importMap, cwd);

  // 执行构建
  // 注意：denoPlugins 应该放在最前面，因为它处理基础的模块解析
  // 我们的自定义插件放在后面，处理特殊逻辑（如路径别名、@dreamer/dweb/client 等）
  return await esbuild.build({
    entryPoints,
    ...getBaseConfig(),
    minify,
    sourcemap,
    keepNames,
    legalComments,
    external: finalExternalPackages,
    plugins: [...denoLoaderPlugins, jsrResolverPlugin, ...plugins],
    alias,
    ...(splitting && outdir ? { splitting: true, outdir, outbase } : {}),
  });
}


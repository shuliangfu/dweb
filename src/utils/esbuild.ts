/**
 * Esbuild 工具函数
 * 统一管理所有 esbuild 相关的配置和插件
 */

import * as esbuild from "esbuild";
import * as path from "@std/path";
import { getExternalPackages } from "./module.ts";

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
          // 如果父包不在 external 列表中，需要解析子路径以便打包
          // 从 import map 中查找父包的映射
          const parentImport = importMap[parentPackage];
          if (parentImport) {
            // 提取子路径（如 "chart/auto" -> "auto"）
            const subPath = args.path.substring(parentPackage.length + 1);
            // 构建完整的 npm/jsr 路径
            let fullPath: string;
            if (parentImport.startsWith("npm:")) {
              // npm:chart.js@4.4.7 -> npm:chart.js@4.4.7/auto
              fullPath = `${parentImport}/${subPath}`;
            } else if (parentImport.startsWith("jsr:")) {
              // jsr:@scope/package@1.0.0 -> jsr:@scope/package@1.0.0/subpath
              fullPath = `${parentImport}/${subPath}`;
            } else {
              // 其他情况，返回 undefined 让 esbuild 处理
              return undefined;
            }
            
            // 使用 Deno 的 import.meta.resolve 来解析路径
            try {
              const resolved = await import.meta.resolve(fullPath);
              // 将 file:// URL 转换为绝对路径
              let resolvedPath: string;
              if (resolved.startsWith("file://")) {
                // 使用 URL 对象解析 file:// URL
                const url = new URL(resolved);
                resolvedPath = url.pathname;
                // 在 Windows 上，pathname 可能以 / 开头，需要移除（但 Deno 通常处理得很好）
                // 在 Unix 系统上，pathname 就是正确的路径
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
        // 如果是 JSR URL，标记为 external，通过网络请求加载
        if (args.path.startsWith("@dreamer/dweb/")) {
          const parentPackage = "@dreamer/dweb";
          const parentImport = importMap[parentPackage];
          // 如果父包是 JSR URL，子路径也应该标记为 external
          if (parentImport && parentImport.startsWith("jsr:")) {
            return {
              path: args.path,
              external: true,
            };
          }
        }
        
        // 首先检查子路径本身是否在 import map 中（如 "@scope/package/subpath"）
        // 如果子路径本身在 import map 中，直接标记为 external
        if (args.path in importMap) {
          return {
            path: args.path,
            external: true,
          };
        }
        
        // 提取父包名（如 "@scope/package/subpath" -> "@scope/package"）
        const parts = args.path.split("/");
        if (parts.length >= 3) {
          const parentPackage = `${parts[0]}/${parts[1]}`;
          // 如果父包在 external 列表中，将子路径也标记为 external
          if (externalPackages.includes(parentPackage)) {
            return {
              path: args.path,
              external: true,
            };
          }
          // 如果父包在 import map 中（npm/jsr/http），子路径也应该标记为 external
          // 因为浏览器会通过 import map 来解析，esbuild 无法打包 npm/jsr 包的子路径
          if (parentPackage in importMap) {
            const parentImport = importMap[parentPackage];
            // 如果父包是 JSR URL 或 npm URL，子路径应该标记为 external
            if (parentImport.startsWith("jsr:") || parentImport.startsWith("npm:") || parentImport.startsWith("http")) {
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
      
      build.onResolve({ filter: /^@dreamer\/dweb\/client$/ }, (_args) => {
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

        // 如果是 JSR URL，标记为 external，不打包，通过网络请求加载
        if (clientImport.startsWith("jsr:")) {
          // 直接标记为 external，让浏览器通过 import map 加载
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

  // 构建 alias 配置
  const alias = buildAliasConfig(importMap, cwd);

  // 执行构建
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
    plugins: [jsrResolverPlugin, ...plugins],
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

  // 构建 alias 配置
  const alias = buildAliasConfig(importMap, cwd);

  // 执行构建
  return await esbuild.build({
    entryPoints,
    ...getBaseConfig(),
    minify,
    sourcemap,
    keepNames,
    legalComments,
    external: finalExternalPackages,
    plugins: [jsrResolverPlugin, ...plugins],
    alias,
    ...(splitting && outdir ? { splitting: true, outdir, outbase } : {}),
  });
}


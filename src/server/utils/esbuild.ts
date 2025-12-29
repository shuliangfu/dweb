/**
 * Esbuild 工具函数
 * 统一管理所有 esbuild 相关的配置和插件
 */

import * as esbuild from "esbuild";
import * as path from "@std/path";
import { getExternalPackages } from "./module.ts";

// 调试模式：直接输出日志

/**
 * 将 jsr: 协议转换为浏览器可访问的 HTTP URL
 * 使用 esm.sh 的 /jsr/ 路径来访问 JSR 包
 * 与 import-map.ts 中的 convertJsrToBrowserUrl 保持一致
 * @param jsrUrl jsr: 协议的 URL，例如：jsr:@dreamer/dweb@^1.8.2/client
 * @returns 浏览器可访问的 HTTP URL，例如：https://esm.sh/jsr/@dreamer/dweb@1.8.2/client?bundle
 */
function convertJsrToHttpUrl(jsrUrl: string): string {
  // 移除 jsr: 前缀
  const jsrPath = jsrUrl.replace(/^jsr:/, "");

  // 匹配格式：@scope/package@version 或 @scope/package@version/subpath
  // 版本号可能包含 ^、~ 等符号，以及预发布版本号（如 -beta.2、-alpha.1、-rc.1）
  const jsrMatch = jsrPath.match(
    /^@([\w-]+)\/([\w-]+)@([\^~]?[\d.]+(?:-[\w.]+)?)(?:\/(.+))?$/,
  );

  if (!jsrMatch) {
    // 如果无法匹配，使用 esm.sh 的格式
    return `https://esm.sh/jsr/${jsrPath}?bundle`;
  }

  const [, scope, packageName, versionWithPrefix, subPath] = jsrMatch;

  // 移除版本号前缀（^ 或 ~），只保留版本号本身
  const version = versionWithPrefix.replace(/^[\^~]/, "");

  // 使用 esm.sh 的 /jsr/ 路径格式
  // 格式：https://esm.sh/jsr/@scope/package@version/subpath?bundle
  if (subPath) {
    // 有子路径，直接使用子路径（不需要映射到文件路径）
    // esm.sh 会自动处理 JSR 包的子路径解析
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}/${subPath}?bundle`;
  } else {
    // 没有子路径，指向包的默认入口（esm.sh 会自动处理）
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}?bundle`;
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
/**
 * 将 npm: 协议转换为浏览器可访问的 URL
 * @param npmUrl npm: 协议的 URL，例如：npm:chart.js@4.4.7
 * @returns 浏览器可访问的 URL，例如：https://esm.sh/chart.js@4.4.7
 */
function convertNpmToBrowserUrl(npmUrl: string): string {
  // 移除 npm: 前缀
  const packageSpec = npmUrl.replace(/^npm:/, "");
  // 使用 esm.sh 作为 CDN（支持 ESM 格式）
  return `https://esm.sh/${packageSpec}`;
}

/**
 * 将 jsr: 协议转换为浏览器可访问的 URL
 * @param jsrUrl jsr: 协议的 URL，例如：jsr:@dreamer/dweb@1.8.2/extensions/web3
 * @returns 浏览器可访问的 URL，例如：https://esm.sh/jsr/@dreamer/dweb@1.8.2/extensions/web3?bundle
 */
function convertJsrToBrowserUrl(jsrUrl: string): string {
  // 移除 jsr: 前缀
  const jsrPath = jsrUrl.replace(/^jsr:/, "");

  // 匹配格式：@scope/package@version 或 @scope/package@version/subpath
  const jsrMatch = jsrPath.match(
    /^@([\w-]+)\/([\w-]+)@([\^~]?[\d.]+(?:-[\w.]+)?)(?:\/(.+))?$/,
  );

  if (!jsrMatch) {
    // 如果无法匹配，使用 esm.sh 的格式
    return `https://esm.sh/jsr/${jsrPath}?bundle`;
  }

  const [, scope, packageName, versionWithPrefix, subPath] = jsrMatch;

  // 移除版本号前缀（^ 或 ~），只保留版本号本身
  const version = versionWithPrefix.replace(/^[\^~]/, "");

  // 使用 esm.sh 的 /jsr/ 路径格式
  if (subPath) {
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}/${subPath}?bundle`;
  } else {
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}?bundle`;
  }
}

/**
 * 将 import map 中的 URL 转换为浏览器可访问的 URL
 * @param importValue import map 中的原始值
 * @returns 转换后的浏览器可访问的 URL
 */
function convertToBrowserUrl(importValue: string): string {
  // 如果已经是 HTTP URL，直接返回
  if (importValue.startsWith("http://") || importValue.startsWith("https://")) {
    return importValue;
  }

  // 处理 npm: 协议
  if (importValue.startsWith("npm:")) {
    return convertNpmToBrowserUrl(importValue);
  }

  // 处理 jsr: 协议
  if (importValue.startsWith("jsr:")) {
    return convertJsrToBrowserUrl(importValue);
  }

  // 其他情况（本地路径等），直接返回
  return importValue;
}

/**
 * 创建导入替换插件
 * 在编译时直接替换代码中的依赖导入为浏览器可访问的 URL
 * 例如：import Chart from "chart/auto" -> import Chart from "https://esm.sh/chart.js@4.4.7/auto"
 * @param importMap import map 配置
 * @returns esbuild 插件
 */
function createImportReplacerPlugin(
  importMap: Record<string, string>,
  isServerBuild: boolean = false,
): esbuild.Plugin {
  return {
    name: "import-replacer",
    setup(build: esbuild.PluginBuild) {
      // 在解析模块时替换导入路径
      // 注意：这个插件只处理外部依赖（npm、jsr），本地依赖会被其他插件处理并打包
      build.onResolve({ filter: /.*/ }, (args) => {
        const importPath = args.path;

        // 跳过相对路径导入（这些是本地依赖，应该被打包）
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          return undefined;
        }

        // 跳过 HTTP URL（已经是外部 URL）
        if (
          importPath.startsWith("http://") || importPath.startsWith("https://")
        ) {
          return undefined;
        }

        // 跳过路径别名（以 @ 开头且可能是路径别名，由 createJSRResolverPlugin 处理）
        // 路径别名会被解析为本地文件路径并打包
        if (importPath.startsWith("@")) {
          // 检查是否是路径别名（在 importMap 中以 / 结尾）
          for (const [aliasKey] of Object.keys(importMap)) {
            if (aliasKey.endsWith("/") && importPath.startsWith(aliasKey)) {
              // 这是路径别名，让 createJSRResolverPlugin 处理
              return undefined;
            }
          }
        }

        // 服务端构建时，preact 相关依赖保持原始导入，不转换为 HTTP URL
        // 这样运行时可以使用项目的 import map，确保与 route-handler.ts 使用同一个 preact 实例
        // 2024-03-24 更新：由于 preact 已从 deno.json 移除，我们需要使用 import map 中的值（如果有）
        // 如果 import map 中没有值，下面的逻辑会返回 undefined，然后 esbuild 会尝试解析
        if (
          isServerBuild && (
            importPath === "preact" ||
            importPath.startsWith("preact/") ||
            importPath === "preact-render-to-string" ||
            importPath.startsWith("preact-render-to-string/")
          )
        ) {
          // 检查 import map 中是否有值，如果有则使用 mapped value（通常是 npm:preact@...）
          // 这样 Deno 运行时就能解析到具体的 npm 包
          if (importPath in importMap) {
            const mappedValue = importMap[importPath];
            return {
              path: mappedValue,
              external: true,
            };
          }

          // 如果是子路径（如 preact/hooks），尝试从父包解析
          if (importPath.includes("/")) {
            const parentPackage = importPath.split("/")[0];
            if (parentPackage in importMap) {
              const mappedValue = importMap[parentPackage];
              // 如果 mappedValue 是 npm:preact@x.y.z，我们需要追加子路径
              // 例如：npm:preact@10.28.0/hooks
              if (mappedValue.startsWith("npm:")) {
                // 移除可能的末尾斜杠
                const cleanMapped = mappedValue.endsWith("/")
                  ? mappedValue.slice(0, -1)
                  : mappedValue;
                const subPath = importPath.substring(parentPackage.length); // /hooks
                return {
                  path: cleanMapped + subPath,
                  external: true,
                };
              }
            }
          }

          // 保持原始导入（作为最后的后备方案，虽然这在没有 import map 的情况下会失败）
          return {
            path: importPath,
            external: true,
          };
        }

        // 检查是否是外部依赖（npm、jsr）
        let resolvedPath: string | undefined;
        let isLocalPath = false;

        // 1. 直接检查 importMap 中是否有这个路径
        if (importPath in importMap) {
          const mappedValue = importMap[importPath];
          // 检查是否是本地路径（以 ./ 或 ../ 开头）
          if (mappedValue.startsWith("./") || mappedValue.startsWith("../")) {
            // 本地路径，应该被打包，不替换
            isLocalPath = true;
          } else {
            // 外部依赖，转换为浏览器 URL（仅客户端构建）
            resolvedPath = isServerBuild
              ? mappedValue
              : convertToBrowserUrl(mappedValue);
          }
        } else {
          // 2. 检查是否是子路径，尝试从父包生成
          if (importPath.includes("/") && !importPath.startsWith("@")) {
            // 普通包的子路径（如 chart/auto）
            const parentPackage = importPath.split("/")[0];
            if (parentPackage in importMap) {
              const parentImport = importMap[parentPackage];
              // 检查父包是否是本地路径
              if (
                parentImport.startsWith("./") || parentImport.startsWith("../")
              ) {
                // 父包是本地路径，子路径也应该是本地路径，应该被打包
                isLocalPath = true;
              } else {
                // 父包是外部依赖，生成子路径的 URL（服务端保持原始，客户端转换为浏览器 URL）
                const subPath = importPath.substring(parentPackage.length + 1);
                const subPathImport = `${parentImport}/${subPath}`;
                resolvedPath = isServerBuild
                  ? subPathImport
                  : convertToBrowserUrl(subPathImport);
              }
            }
          } else if (
            importPath.startsWith("@") && importPath.split("/").length >= 3
          ) {
            // @scope/package/subpath 格式
            const parts = importPath.split("/");
            const parentPackage = `${parts[0]}/${parts[1]}`;
            if (parentPackage in importMap) {
              const parentImport = importMap[parentPackage];
              // 检查父包是否是本地路径
              if (
                parentImport.startsWith("./") || parentImport.startsWith("../")
              ) {
                // 父包是本地路径，子路径也应该是本地路径，应该被打包
                isLocalPath = true;
              } else {
                // 父包是外部依赖，生成子路径的 URL（服务端保持原始，客户端转换为浏览器 URL）
                const subPath = parts.slice(2).join("/");
                const subPathImport = `${parentImport}/${subPath}`;
                resolvedPath = isServerBuild
                  ? subPathImport
                  : convertToBrowserUrl(subPathImport);
              }
            }
          } else {
            // 3. 直接检查是否是根包
            if (importPath in importMap) {
              const mappedValue = importMap[importPath];
              // 检查是否是本地路径
              if (
                mappedValue.startsWith("./") || mappedValue.startsWith("../")
              ) {
                // 本地路径，应该被打包，不替换
                isLocalPath = true;
              } else {
                // 外部依赖，转换为浏览器 URL（仅客户端构建）
                resolvedPath = isServerBuild
                  ? mappedValue
                  : convertToBrowserUrl(mappedValue);
              }
            }
          }
        }

        // 如果是本地路径，返回 undefined，让 esbuild 打包它
        if (isLocalPath) {
          return undefined;
        }

        // 如果找到了外部依赖的映射，返回替换后的路径
        if (resolvedPath) {
          return {
            path: resolvedPath,
            external: true, // 标记为外部依赖，不打包
          };
        }

        return undefined;
      });
    },
  };
}

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
                          text:
                            `Path alias file not found: "${args.path}" (${aliasKey} -> ${aliasValue}${subPath})`,
                        }],
                      };
                    }
                  }
                }
                // 文件不存在，返回错误
                return {
                  errors: [{
                    text:
                      `Path alias file not found: "${args.path}" (${aliasKey} -> ${aliasValue}${subPath})`,
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
                  text:
                    `Failed to resolve path alias "${args.path}" (${aliasKey} -> ${aliasValue}): ${
                      error instanceof Error ? error.message : String(error)
                    }`,
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
        if (
          args.path.includes("/") && !args.path.startsWith(".") &&
          !args.path.startsWith("/") && !args.path.startsWith("@")
        ) {
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
                  text:
                    `Failed to resolve subpath "${args.path}" from parent package "${parentPackage}": ${
                      error instanceof Error ? error.message : String(error)
                    }`,
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
            if (
              parentImport.startsWith("npm:") || parentImport.startsWith("http")
            ) {
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
            if (
              mappedUrl.startsWith("/__jsr/") || mappedUrl.startsWith("http")
            ) {
              return {
                path: mappedUrl,
                external: true,
              };
            }
          }

          // 如果没有在 import map 中找到，使用转换函数生成 HTTP URL
          const httpUrl = convertJsrToHttpUrl(args.path);
          return {
            path: httpUrl,
            external: true,
          };
        }
        return undefined;
      });

      // 处理 @dreamer/dweb/client（必须在其他处理器之前，确保优先级最高）
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
              const basePath = mainImport.substring(
                0,
                mainImport.lastIndexOf("/"),
              );
              clientImport = `${basePath}/client.ts`;
            }
          }
        }

        if (!clientImport) {
          return undefined; // 让 esbuild 使用默认解析
        }

        // 如果是 JSR URL，转换为代理路径后标记为 external，不打包，通过网络请求加载
        if (clientImport.startsWith("jsr:")) {
          // 将 JSR URL 转换为浏览器可访问的 HTTP URL（esm.sh）
          const httpUrl = convertJsrToHttpUrl(clientImport);
          // 标记为 external，浏览器会通过 esm.sh CDN 加载
          // 注意：即使 @dreamer/dweb/client 在 externalPackages 列表中，
          // 插件返回的 path 会覆盖 esbuild 的默认行为，输出代码中会使用 HTTP URL
          return {
            path: httpUrl,
            external: true,
          };
        }

        // 如果已经是 HTTP URL，直接使用
        if (
          clientImport.startsWith("http://") ||
          clientImport.startsWith("https://")
        ) {
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
      build.onResolve(
        { filter: /^\.\.?\/.*/, namespace: "http-url" },
        (args) => {
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
                text: `Failed to resolve relative path: ${args.path} (${
                  error instanceof Error ? error.message : String(error)
                })`,
              }],
            };
          }
        },
      );

      // 加载 HTTP URL 内容
      build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
        try {
          const response = await fetch(args.path);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch: ${args.path} (${response.status})`,
            );
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
  charset: "utf8";
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
    charset: "utf8",
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
  /** 是否为服务端构建（默认根据 bundleClient 推断：!bundleClient） */
  isServerBuild?: boolean;
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

  // 注入框架默认依赖（如果 import map 中缺失）
  // 这样即使用户的 deno.json 中没有配置这些依赖，框架也能正常构建和运行
  if (!importMap["preact"]) {
    importMap["preact"] = "npm:preact@10.28.0";
    importMap["preact/"] = "npm:preact@10.28.0/";
  }
  if (!importMap["preact/jsx-runtime"]) {
    importMap["preact/jsx-runtime"] = "npm:preact@10.28.0/jsx-runtime";
  }
  if (!importMap["preact/hooks"]) {
    importMap["preact/hooks"] = "npm:preact@10.28.0/hooks";
  }
  if (!importMap["preact-render-to-string"]) {
    importMap["preact-render-to-string"] = "npm:preact-render-to-string@6.5.1";
  }
  if (!importMap["react"]) {
    importMap["react"] = "npm:react@^18.3.1";
  }
  if (!importMap["react-dom"]) {
    importMap["react-dom"] = "npm:react-dom@^18.3.1";
  }
  if (!importMap["vue"]) {
    importMap["vue"] = "npm:vue@^3.5.13";
  }
  if (!importMap["@vue/server-renderer"]) {
    importMap["@vue/server-renderer"] = "npm:@vue/server-renderer@^3.5.13";
  }

  // 创建导入替换插件（在编译时直接替换代码中的依赖导入）
  // 服务端构建时，preact 相关依赖保持原始导入，不转换为 HTTP URL
  const isServerBuild = !bundleClient;
  const importReplacerPlugin = createImportReplacerPlugin(
    importMap,
    isServerBuild,
  );

  // 创建 JSR 解析插件
  const jsrResolverPlugin = createJSRResolverPlugin(
    importMap,
    cwd,
    finalExternalPackages,
  );

  // 构建 alias 配置
  const alias = buildAliasConfig(importMap, cwd);

  // 执行构建
  // 使用导入替换插件在编译时替换依赖导入，然后使用 jsrResolverPlugin 处理其他模块解析
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
    plugins: [importReplacerPlugin, jsrResolverPlugin, ...plugins],
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
 * 构建入口点（添加调试日志）
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
    /** 前置插件（在其他插件之前执行） */
    prePlugins?: esbuild.Plugin[];
  },
): Promise<esbuild.BuildResult> {
  const {
    importMap,
    cwd,
    bundleClient = false,
    isServerBuild: explicitIsServerBuild,
    minify = false,
    sourcemap = false,
    keepNames = false,
    legalComments = "none",
    externalPackages,
    plugins = [],
    outdir,
    outbase,
    splitting = false,
    prePlugins = [],
  } = options;

  // 如果没有提供外部依赖列表，自动生成
  const finalExternalPackages = externalPackages ??
    getExternalPackages(importMap, bundleClient, false);

  // 注入框架默认依赖（如果 import map 中缺失）
  // 这样即使用户的 deno.json 中没有配置这些依赖，框架也能正常构建和运行
  if (!importMap["preact"]) {
    importMap["preact"] = "npm:preact@10.28.0";
    importMap["preact/"] = "npm:preact@10.28.0/";
  }
  if (!importMap["preact-render-to-string"]) {
    importMap["preact-render-to-string"] = "npm:preact-render-to-string@6.5.1";
  }
  if (!importMap["react"]) {
    importMap["react"] = "npm:react@^18.3.1";
  }
  if (!importMap["react-dom"]) {
    importMap["react-dom"] = "npm:react-dom@^18.3.1";
  }
  if (!importMap["vue"]) {
    importMap["vue"] = "npm:vue@^3.5.13";
  }
  if (!importMap["@vue/server-renderer"]) {
    importMap["@vue/server-renderer"] = "npm:@vue/server-renderer@^3.5.13";
  }

  // 判断是否为服务端构建：如果明确指定了 isServerBuild，使用它；否则根据 bundleClient 推断
  // 注意：服务端构建时，preact 相关依赖应该保持原始导入，不转换为 HTTP URL
  const isServerBuild = explicitIsServerBuild ?? !bundleClient;

  // 创建导入替换插件（在编译时直接替换代码中的依赖导入）
  // 服务端构建时，preact 相关依赖保持原始导入，不转换为 HTTP URL
  const importReplacerPlugin = createImportReplacerPlugin(
    importMap,
    isServerBuild,
  );

  // 创建 JSR 解析插件
  const jsrResolverPlugin = createJSRResolverPlugin(
    importMap,
    cwd,
    finalExternalPackages,
  );

  // 构建 alias 配置
  const alias = buildAliasConfig(importMap, cwd);

  // 执行构建
  // 使用导入替换插件在编译时替换依赖导入，然后使用 jsrResolverPlugin 处理其他模块解析
  // 前置插件在最前面执行，然后是导入替换插件，然后是 jsrResolverPlugin，最后是其他插件
  return await esbuild.build({
    entryPoints,
    ...getBaseConfig(),
    minify,
    sourcemap,
    keepNames,
    legalComments,
    external: finalExternalPackages,
    plugins: [
      ...prePlugins,
      importReplacerPlugin,
      jsrResolverPlugin,
      ...plugins,
    ],
    alias,
    ...(splitting && outdir ? { splitting: true, outdir, outbase } : {}),
  });
}

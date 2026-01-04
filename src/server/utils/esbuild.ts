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
  // 对于包含 npm 依赖的子路径（如 utils/web3），使用 ?bundle=false 让依赖保持 external
  // 这样可以减小包体积，npm 依赖（如 ethers）通过 esm.sh 自动转换的 URL 单独加载
  // 格式：https://esm.sh/jsr/@scope/package@version/subpath?bundle=false
  let queryParams = "bundle";
  if (subPath && subPath.includes("utils")) {
    // web3 子路径包含大量 npm 依赖（ethers），使用 bundle=false 避免打包
    queryParams = "bundle";
  }

  if (subPath) {
    // 有子路径，直接使用子路径（不需要映射到文件路径）
    // esm.sh 会自动处理 JSR 包的子路径解析
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}/${subPath}?${queryParams}`;
  } else {
    // 没有子路径，指向包的默认入口（esm.sh 会自动处理）
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}?${queryParams}`;
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
  // 对于包含 npm 依赖的子路径（如 utils/web3），使用 ?bundle=false 让依赖保持 external
  // 这样可以减小包体积，npm 依赖（如 ethers）通过 esm.sh 自动转换的 URL 单独加载
  let queryParams = "bundle";
  if (subPath && subPath.includes("utils")) {
    // web3 子路径包含大量 npm 依赖（ethers），使用 bundle=false 避免打包
    queryParams = "bundle";
  }

  if (subPath) {
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}/${subPath}?${queryParams}`;
  } else {
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}?${queryParams}`;
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
 * 智能注入框架默认依赖
 * 检查 importMap 中是否已有相关依赖（通过 key 前缀匹配），如果没有则使用默认值
 * @param importMap import map 对象（会被修改）
 */
function injectDefaultDependencies(importMap: Record<string, string>): void {
  // 处理 preact 相关依赖
  const preactBase = importMap["preact"] ||
    importMap["preact/"]?.replace(/\/$/, "");

  if (preactBase) {
    // 从 deno.json 读取到 preact 配置，自动拼接子路径（如果不存在）
    // 确保 preact/ 存在（用于子路径匹配）
    if (!importMap["preact/"]) {
      importMap["preact/"] = preactBase.endsWith("/")
        ? preactBase
        : `${preactBase}/`;
    }
    // 自动拼接子路径（如果用户没有在 deno.json 中定义）
    if (!importMap["preact/jsx-runtime"]) {
      importMap["preact/jsx-runtime"] = `${preactBase}/jsx-runtime`;
    }
    if (!importMap["preact/hooks"]) {
      importMap["preact/hooks"] = `${preactBase}/hooks`;
    }
    // preact/signals 是独立包 @preact/signals，不是 preact 的子路径
    // 如果用户没有配置，使用默认值
    if (!importMap["preact/signals"]) {
      importMap["preact/signals"] = "npm:@preact/signals@1.2.2";
    }
    // preact-render-to-string 是独立包
    if (!importMap["preact-render-to-string"]) {
      importMap["preact-render-to-string"] =
        "npm:preact-render-to-string@6.5.1";
    }
  } else {
    // 检查是否存在 @preact/ 开头的依赖（如 @preact/signals）
    const hasAtPreact = Object.keys(importMap).some((key) =>
      key.startsWith("@preact/")
    );

    // 如果 deno.json 中完全没有 preact 相关配置，才使用默认值
    if (!hasAtPreact) {
      importMap["preact"] = "npm:preact@10.28.0";
      importMap["preact/"] = "npm:preact@10.28.0/";
      importMap["preact/jsx-runtime"] = "npm:preact@10.28.0/jsx-runtime";
      importMap["preact/hooks"] = "npm:preact@10.28.0/hooks";
      importMap["preact/signals"] = "npm:@preact/signals@1.2.2";
      importMap["preact-render-to-string"] =
        "npm:preact-render-to-string@6.5.1";
    }
  }

  // 处理 react 相关依赖
  const reactBase = importMap["react"];
  if (reactBase) {
    // 从 deno.json 读取到 react 配置，自动推断 react-dom 的版本（如果不存在）
    if (!importMap["react-dom"]) {
      // 尝试从 react 的版本推断 react-dom 的版本
      // 如果 react 是 npm:react@^18.3.1，则 react-dom 应该是 npm:react-dom@^18.3.1
      const reactVersion = reactBase.match(/@([^/]+)/)?.[1] || "^18.3.1";
      importMap["react-dom"] = reactBase.replace(
        /react(@|$)/,
        `react-dom@${reactVersion}`,
      );
    }
  } else {
    // 检查是否存在 react 相关的依赖（如 react-dom、react/ 等）
    const hasReact = Object.keys(importMap).some((key) =>
      key.startsWith("react/") || key.startsWith("react-")
    );

    // 如果 deno.json 中完全没有 react 相关配置，才使用默认值
    if (!hasReact) {
      importMap["react"] = "npm:react@^18.3.1";
      importMap["react-dom"] = "npm:react-dom@^18.3.1";
    }
  }

  // 处理 vue 相关依赖
  const vueBase = importMap["vue"];
  if (vueBase) {
    // 从 deno.json 读取到 vue 配置，自动推断 @vue/server-renderer 的版本（如果不存在）
    if (!importMap["@vue/server-renderer"]) {
      // 尝试从 vue 的版本推断 @vue/server-renderer 的版本
      const vueVersion = vueBase.match(/@([^/]+)/)?.[1] || "^3.5.13";
      importMap["@vue/server-renderer"] =
        `npm:@vue/server-renderer@${vueVersion}`;
    }
  } else {
    // 检查是否存在 vue 相关的依赖（如 @vue/ 开头的）
    const hasVue = Object.keys(importMap).some((key) =>
      key.startsWith("vue/") || key.startsWith("@vue/")
    );

    // 如果 deno.json 中完全没有 vue 相关配置，才使用默认值
    if (!hasVue) {
      importMap["vue"] = "npm:vue@^3.5.13";
      importMap["@vue/server-renderer"] = "npm:@vue/server-renderer@^3.5.13";
    }
  }
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
  cwd: string,
  externalPackages: string[] = [],
  isServerRender: boolean = false,
): esbuild.Plugin {
  return {
    name: "import-replacer",
    setup(build: esbuild.PluginBuild) {
      // 在解析模块时替换导入路径
      // 注意：这个插件只处理外部依赖（npm、jsr），本地依赖会被其他插件处理并打包
      // 相对路径和路径别名应该先被 createJSRResolverPlugin 处理
      build.onResolve({ filter: /.*/ }, (args) => {
        const importPath = args.path;

        // 直接处理 npm: 协议导入
        if (importPath.startsWith("npm:")) {
          // 服务端构建：保留 npm: 导入并标记为 external，让 Deno 在运行时解析
          if (isServerBuild || isServerRender) {
            return {
              path: importPath,
              external: true,
            };
          }
          // 客户端构建：转换为可在浏览器加载的 URL（使用 esm.sh）
          const httpUrl = convertNpmToBrowserUrl(importPath);
          return {
            path: httpUrl,
            external: true,
          };
        }

        // 直接处理 jsr: 协议导入
        if (importPath.startsWith("jsr:")) {
          // 服务端构建：保留 jsr: 导入并标记为 external，让 Deno 在运行时解析
          if (isServerBuild || isServerRender) {
            return {
              path: importPath,
              external: true,
            };
          }
          // 客户端构建：转换为可在浏览器加载的 URL（使用 esm.sh）
          const httpUrl = convertJsrToBrowserUrl(importPath);
          return {
            path: httpUrl,
            external: true,
          };
        }

        // 跳过相对路径导入（这些是本地依赖，应该被打包，由其他插件处理）
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          return undefined;
        }

        // 跳过 HTTP URL（已经是外部 URL）
        if (
          importPath.startsWith("http://") || importPath.startsWith("https://")
        ) {
          return undefined;
        }

        // 处理子路径导入（如 chart/auto），必须在路径别名检查之前
        // 因为子路径导入可能被误判为路径别名
        if (importPath.includes("/") && !importPath.startsWith("@")) {
          // 先检查 importMap 中是否有完整的子路径映射（如 preact/signals）
          // 这样可以处理像 preact/signals 这样的独立包，它们不是父包的子路径
          if (importPath in importMap) {
            const mappedValue = importMap[importPath];
            // 检查 mappedValue 是否存在且有效
            if (mappedValue) {
              // 如果是服务端渲染或服务端构建，保持原始格式
              // 如果是客户端渲染，转换为 HTTP URL（如果还不是 HTTP URL）
              let finalPath: string;
              if (isServerBuild || isServerRender) {
                finalPath = mappedValue;
              } else {
                // 客户端渲染：如果还不是 HTTP URL，转换为 HTTP URL
                if (
                  mappedValue.startsWith("http://") ||
                  mappedValue.startsWith("https://")
                ) {
                  finalPath = mappedValue;
                } else {
                  finalPath = convertToBrowserUrl(mappedValue);
                }
              }
              return {
                path: finalPath,
                external: true,
              };
            }
            // 如果 mappedValue 不存在或为空，继续执行后面的从父包拼接逻辑
          }

          // 如果没有完整映射，尝试从父包拼接（如 chart/auto）
          const parentPackage = importPath.split("/")[0];
          if (parentPackage in importMap) {
            const parentImport = importMap[parentPackage];
            // 如果父包是外部依赖（npm:/jsr:/http:），需要将子路径转换为完整的 URL
            // 服务端渲染：chart/auto -> npm:chart.js@4.4.7/auto
            // 客户端渲染：chart/auto -> https://esm.sh/chart.js@4.4.7/auto
            if (
              parentImport.startsWith("npm:") ||
              parentImport.startsWith("jsr:") ||
              parentImport.startsWith("http://") ||
              parentImport.startsWith("https://")
            ) {
              // 提取子路径（如 "chart/auto" -> "auto"）
              const subPath = importPath.substring(parentPackage.length + 1);
              // 构建完整的导入路径
              let fullImportPath: string;
              if (
                parentImport.startsWith("npm:") ||
                parentImport.startsWith("jsr:")
              ) {
                // 构建完整的 npm/jsr URL（如 npm:chart.js@4.4.7/auto）
                const fullNpmJsrPath = `${parentImport}/${subPath}`;
                // 如果是服务端渲染或服务端构建，保持 npm:/jsr: 格式
                // 如果是客户端渲染，转换为 HTTP URL
                if (isServerBuild || isServerRender) {
                  fullImportPath = fullNpmJsrPath;
                } else {
                  // 客户端渲染：转换为浏览器可访问的 HTTP URL
                  fullImportPath = convertToBrowserUrl(fullNpmJsrPath);
                }
              } else {
                // http:// 或 https://，直接拼接子路径
                fullImportPath = `${parentImport}/${subPath}`;
              }
              // 返回转换后的完整路径，标记为 external
              return {
                path: fullImportPath,
                external: true,
              };
            }
          }
        }

        // 跳过路径别名（以 @ 开头且可能是路径别名，由 createJSRResolverPlugin 处理）
        // 路径别名会被解析为本地文件路径并打包
        // 同时跳过 @dreamer/dweb/* 子路径，让 createJSRResolverPlugin 专门处理
        if (importPath.startsWith("@")) {
          // 排除 @dreamer/dweb/* 子路径，让专门处理器处理
          if (importPath.startsWith("@dreamer/dweb")) {
            return undefined;
          }
          // 检查是否是路径别名（在 importMap 中以 / 结尾）
          for (const [aliasKey] of Object.keys(importMap)) {
            if (aliasKey.endsWith("/") && importPath.startsWith(aliasKey)) {
              // 这是路径别名，让 createJSRResolverPlugin 处理
              return undefined;
            }
          }
        }

        // Preact 相关依赖应该保持 external，避免多个 Preact 实例导致 hooks 上下文错误
        // 检查是否在 externalPackages 列表中，或者是否是服务端构建
        const isPreactRelated = importPath === "preact" ||
          importPath.startsWith("preact/") ||
          importPath === "preact-render-to-string" ||
          importPath.startsWith("preact-render-to-string/");

        // 如果 Preact 在 externalPackages 列表中，或者是服务端构建/渲染，都应该标记为 external
        // 服务端渲染时，即使 isServerBuild 为 false，也应该使用 npm: 协议（服务端运行）
        // 客户端渲染时，应该转换为 HTTP URL（浏览器加载）
        const shouldKeepPreactExternal = isPreactRelated && (
          isServerBuild ||
          isServerRender ||
          externalPackages.includes(importPath) ||
          externalPackages.some((pkg) => importPath.startsWith(pkg + "/"))
        );

        if (shouldKeepPreactExternal) {
          // 服务端渲染或服务端构建时，使用 npm: 协议（Deno 运行时解析）
          // 客户端渲染时，转换为 HTTP URL（浏览器加载）
          const useNpmProtocol = isServerBuild || isServerRender;

          if (useNpmProtocol) {
            // 服务端渲染或服务端构建：使用 npm: 协议（Deno 运行时解析）
            // 检查 import map 中是否有值，如果有则使用 mapped value（通常是 npm:preact@...）
            if (importPath in importMap) {
              const mappedValue = importMap[importPath];
              return {
                path: mappedValue,
                external: true,
              };
            }

            // 如果是子路径（如 preact/hooks），尝试从父包解析
            // 注意：preact/signals 是独立包 @preact/signals，不是 preact 的子路径
            if (importPath.includes("/")) {
              // 先检查 importMap 中是否有完整的子路径映射（如 preact/signals）
              // 这样可以处理像 preact/signals 这样的独立包
              if (importPath in importMap) {
                const mappedValue = importMap[importPath];
                return {
                  path: mappedValue,
                  external: true,
                };
              }

              // 如果没有完整映射，尝试从父包解析
              const parentPackage = importPath.split("/")[0];
              if (parentPackage in importMap) {
                const mappedValue = importMap[parentPackage];
                // 如果 mappedValue 是 npm:preact@x.y.z，我们需要追加子路径
                // 例如：npm:preact@10.28.0/hooks
                // 但 preact/signals 是独立包，不应该这样处理
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
          } else {
            // 客户端渲染：转换为 HTTP URL（浏览器加载）
            // 检查 import map 中是否有值
            if (importPath in importMap) {
              const mappedValue = importMap[importPath];
              // 如果已经是 HTTP URL，直接使用
              if (
                mappedValue.startsWith("http://") ||
                mappedValue.startsWith("https://")
              ) {
                return {
                  path: mappedValue,
                  external: true,
                };
              }
              // 如果是 npm: 协议，转换为 HTTP URL
              if (mappedValue.startsWith("npm:")) {
                const httpUrl = convertNpmToBrowserUrl(mappedValue);
                return {
                  path: httpUrl,
                  external: true,
                };
              }
            }
            // 如果没有 import map，使用默认转换
            const httpUrl = convertNpmToBrowserUrl(`npm:${importPath}`);
            return {
              path: httpUrl,
              external: true,
            };
          }
        }

        // 排除 @dreamer/dweb/* 子路径，让 createJSRResolverPlugin 专门处理
        if (importPath.startsWith("@dreamer/dweb")) {
          return undefined;
        }

        // 检查是否是外部依赖（npm、jsr）
        let resolvedPath: string | undefined;
        let isLocalPath = false;

        // 1. 直接检查 importMap 中是否有这个路径
        if (importPath in importMap) {
          const mappedValue = importMap[importPath];
          // 本地路径（以 ./ 或 ../ 开头）：检查是否在 externalPackages 列表中
          if (mappedValue.startsWith("./") || mappedValue.startsWith("../")) {
            // 如果包在 externalPackages 列表中，即使它是本地路径，也标记为 external
            // 这样在服务端构建时，插件代码不会被编译打包，import.meta.url 可以正确指向原始位置
            if (externalPackages.includes(importPath)) {
              const abs = path.isAbsolute(mappedValue)
                ? mappedValue
                : path.resolve(cwd, mappedValue);
              return {
                path: abs,
                external: true,
              };
            }
            // 如果不在 externalPackages 列表中，正常打包
            const abs = path.isAbsolute(mappedValue)
              ? mappedValue
              : path.resolve(cwd, mappedValue);
            return {
              path: abs,
              external: false,
            };
          }
          // 外部依赖：转换为浏览器 URL（仅客户端构建）
          // 如果是服务端渲染或服务端构建，保持原始格式
          // 如果是客户端渲染，转换为 HTTP URL
          resolvedPath = (isServerBuild || isServerRender)
            ? mappedValue
            : convertToBrowserUrl(mappedValue);
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
                // 如果父包在 externalPackages 列表中，即使它是本地路径，也标记为 external
                if (externalPackages.includes(parentPackage)) {
                  // 父包在 external 列表中，子路径也应该标记为 external
                  const subPath = importPath.substring(
                    parentPackage.length + 1,
                  );
                  const abs = path.isAbsolute(parentImport)
                    ? path.join(parentImport, subPath)
                    : path.resolve(cwd, parentImport, subPath);
                  return {
                    path: abs,
                    external: true,
                  };
                }
                // 父包是本地路径，子路径也应该是本地路径，应该被打包
                isLocalPath = true;
              } else {
                // 父包是外部依赖（npm:/jsr:/http:），子路径应该标记为 external
                // 构建完整的导入路径
                const subPath = importPath.substring(
                  parentPackage.length + 1,
                );
                let fullImportPath: string;
                if (
                  parentImport.startsWith("npm:") ||
                  parentImport.startsWith("jsr:")
                ) {
                  // 构建完整的 npm/jsr URL（如 npm:chart.js@4.4.7/auto）
                  const fullNpmJsrPath = `${parentImport}/${subPath}`;
                  // 如果是服务端渲染或服务端构建，保持 npm:/jsr: 格式
                  // 如果是客户端渲染，转换为 HTTP URL
                  if (isServerBuild || isServerRender) {
                    fullImportPath = fullNpmJsrPath;
                  } else {
                    // 客户端渲染：转换为浏览器可访问的 HTTP URL
                    fullImportPath = convertToBrowserUrl(fullNpmJsrPath);
                  }
                } else {
                  // http:// 或 https://，直接拼接子路径
                  fullImportPath = `${parentImport}/${subPath}`;
                }
                return {
                  path: fullImportPath,
                  external: true,
                };
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
                // 如果父包在 externalPackages 列表中，即使它是本地路径，也标记为 external
                if (externalPackages.includes(parentPackage)) {
                  // 父包在 external 列表中，子路径也应该标记为 external
                  const subPath = parts.slice(2).join("/");
                  const abs = path.isAbsolute(parentImport)
                    ? path.join(parentImport, subPath)
                    : path.resolve(cwd, parentImport, subPath);
                  return {
                    path: abs,
                    external: true,
                  };
                }
                // 父包是本地路径，子路径也应该是本地路径，应该被打包
                isLocalPath = true;
              } else {
                // 父包是外部依赖，生成子路径的 URL（服务端保持原始，客户端转换为浏览器 URL）
                const subPath = parts.slice(2).join("/");
                const subPathImport = `${parentImport}/${subPath}`;
                // 如果是服务端渲染或服务端构建，保持原始格式
                // 如果是客户端渲染，转换为 HTTP URL
                resolvedPath = (isServerBuild || isServerRender)
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
                // 如果包在 externalPackages 列表中，即使它是本地路径，也标记为 external
                if (externalPackages.includes(importPath)) {
                  const abs = path.isAbsolute(mappedValue)
                    ? mappedValue
                    : path.resolve(cwd, mappedValue);
                  return {
                    path: abs,
                    external: true,
                  };
                }
                // 本地路径，应该被打包，不替换
                isLocalPath = true;
              } else {
                // 外部依赖，转换为浏览器 URL（仅客户端构建）
                // 如果是服务端渲染或服务端构建，保持原始格式
                // 如果是客户端渲染，转换为 HTTP URL
                resolvedPath = (isServerBuild || isServerRender)
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
  isServerBuild: boolean = false,
  isServerRender: boolean = false,
): esbuild.Plugin {
  return {
    name: "jsr-resolver",
    setup(build: esbuild.PluginBuild) {
      // 统一处理 @dreamer/dweb/* 的所有子路径（如 client、plugins、middleware 等）
      // 必须在所有其他处理器之前执行，确保能拦截到所有 @dreamer/dweb/* 子路径
      // 使用正则匹配 @dreamer/dweb/xxxx，其中 xxxx 表示任意子路径
      // 根据框架的 deno.json 的 exports 配置来解析子路径
      build.onResolve({ filter: /^@dreamer\/dweb\/.+$/ }, async (args) => {
        const subPathImport = args.path; // 如 "@dreamer/dweb/plugins" 或 "@dreamer/dweb/database/mongodb"

        // 步骤 1: 从导入路径中提取子路径名称
        // 例如: "@dreamer/dweb/plugins" -> "plugins"
        //      "@dreamer/dweb/database/mongodb" -> "database/mongodb"
        const subPath = subPathImport.substring("@dreamer/dweb/".length);

        // 步骤 2: 判断是 JSR 包还是本地路径
        // 从 importMap 中获取 @dreamer/dweb 的主路径
        const mainImport = importMap["@dreamer/dweb"];

        // 情况 1: JSR 包（jsr:@dreamer/dweb@^2.1.0）
        // 对于服务端构建，保留 JSR URL 让 Deno 运行时解析（Deno 会自动从 JSR 包的 exports 配置中解析子路径）
        // 对于客户端构建，转换为 HTTP URL
        if (mainImport && mainImport.startsWith("jsr:")) {
          const jsrUrl = `${mainImport}/${subPath}`;
          // 服务端构建：保留 JSR URL，让 Deno 在运行时从 JSR 包的 exports 配置中自动解析子路径
          if (isServerBuild || isServerRender) {
            return {
              path: jsrUrl,
              external: true,
            };
          }
          // 客户端构建：转换为浏览器可访问的 HTTP URL（esm.sh）
          const httpUrl = convertJsrToHttpUrl(jsrUrl);
          return {
            path: httpUrl,
            external: true,
          };
        }

        // 情况 2: 本地路径（../src/mod.ts 或绝对路径）
        // 需要读取框架的 deno.json，从 exports 配置中查找对应的值
        // 步骤 3: 构建 exports 配置中的 key（必须以 ./ 开头）
        // 例如: "plugins" -> "./plugins"
        //      "database/mongodb" -> "./database/mongodb"
        const exportKey = `./${subPath}`;

        let resolvedImport: string | undefined;

        // 步骤 4: 查找框架根目录（包含 deno.json 的目录）
        // 优先从框架的 deno.json 的 exports 配置读取（这是最权威的配置源）
        // 注意：需要读取框架根目录的 deno.json，而不是项目目录的 deno.json
        try {
          const { readDenoJson } = await import("./file.ts");

          // 从 importMap 中获取 @dreamer/dweb 的路径，推断框架根目录
          let frameworkRoot: string | null = null;

          if (
            mainImport && !mainImport.startsWith("http://") &&
            !mainImport.startsWith("https://")
          ) {
            // 本地路径：解析为绝对路径，然后向上查找框架根目录
            const mainImportPath = path.isAbsolute(mainImport)
              ? mainImport
              : path.resolve(cwd, mainImport);

            // 从 src/mod.ts 向上查找，找到包含 deno.json 的目录（框架根目录）
            let currentDir = path.dirname(mainImportPath); // src/
            while (currentDir !== path.dirname(currentDir)) { // 直到根目录
              const denoJsonPath = path.join(currentDir, "deno.json");
              try {
                await Deno.stat(denoJsonPath);
                frameworkRoot = currentDir;
                break;
              } catch {
                // 继续向上查找
                currentDir = path.dirname(currentDir);
              }
            }
          }

          // 步骤 4: 读取框架的 deno.json（如果找到了框架根目录）
          // 如果找到了框架根目录，读取框架的 deno.json；否则读取项目的 deno.json（作为后备）
          const denoJsonPath = frameworkRoot || cwd;
          const denoJson = await readDenoJson(denoJsonPath);

          // 步骤 5: 从 exports 配置中查找对应的值
          if (
            denoJson && typeof denoJson === "object" && "exports" in denoJson
          ) {
            const exports = denoJson.exports as Record<string, string>;

            // 步骤 6: 如果找到了对应的 exportKey，获取其值
            if (
              exports && typeof exports === "object" && exportKey in exports
            ) {
              const exportPath = exports[exportKey]; // 例如: "./src/plugins/mod.ts"

              if (typeof exportPath === "string") {
                // 本地路径: exports 中的路径是相对于框架根目录的，需要转换为绝对路径
                // 例如: "./src/plugins/mod.ts" -> "/Users/shuliangfu/worker/deno/dweb/src/plugins/mod.ts"
                // 注意：JSR URL 的情况已经在最开始处理并返回了，这里只处理本地路径
                const projectRoot = frameworkRoot || cwd;
                const exportAbsolutePath = path.isAbsolute(exportPath)
                  ? exportPath
                  : path.resolve(projectRoot, exportPath);
                resolvedImport = exportAbsolutePath;
              }
            }
          }
        } catch {
          // 如果读取 deno.json 失败，继续使用 importMap 或推断逻辑
        }

        // 如果 exports 配置中没有找到，尝试从 importMap 中读取（作为后备方案）
        if (!resolvedImport) {
          resolvedImport = importMap[subPathImport];

          if (resolvedImport) {
            // 如果是相对路径，需要转换为绝对路径
            if (
              resolvedImport && !resolvedImport.startsWith("jsr:") &&
              !resolvedImport.startsWith("http://") &&
              !resolvedImport.startsWith("https://") &&
              !path.isAbsolute(resolvedImport)
            ) {
              resolvedImport = path.resolve(cwd, resolvedImport);
            }
          }
        }

        if (!resolvedImport) {
          return undefined; // 让 esbuild 使用默认解析
        }

        // 注意：JSR URL 的情况已经在最开始处理并返回了，这里只处理本地路径
        // 如果已经是 HTTP URL，直接使用（这种情况不应该出现在本地路径处理中，但保留作为安全措施）
        if (
          resolvedImport.startsWith("http://") ||
          resolvedImport.startsWith("https://")
        ) {
          return {
            path: resolvedImport,
            external: true,
          };
        }

        // 本地路径需要打包
        const resolvedPath = path.isAbsolute(resolvedImport)
          ? resolvedImport
          : path.resolve(cwd, resolvedImport);

        return {
          path: resolvedPath,
          external: false, // 本地路径需要打包
        };
      });

      // 处理路径别名（以 / 结尾的别名，如 @store/、@components/）
      // 必须在其他处理器之前执行，确保能拦截到路径别名导入
      // 但排除 @dreamer/dweb/*，因为它有专门的处理逻辑
      build.onResolve({ filter: /^@[^/]+\// }, async (args) => {
        // 排除 @dreamer/dweb/*，让它由专门的处理逻辑处理
        if (args.path.startsWith("@dreamer/dweb/")) {
          return undefined;
        }
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
          // 从 import map 中查找父包的映射
          const parentImport = importMap[parentPackage];
          if (parentImport) {
            // 如果父包是 npm:、jsr: 或 http: 导入，需要将子路径转换为完整的 URL
            // 服务端渲染：chart/auto -> npm:chart.js@4.4.7/auto
            // 客户端渲染：chart/auto -> https://esm.sh/chart.js@4.4.7/auto
            // 注意：createJSRResolverPlugin 主要用于服务端渲染，客户端渲染由 createImportReplacerPlugin 处理
            // 但为了完整性，这里也处理客户端渲染的情况
            if (
              parentImport.startsWith("npm:") ||
              parentImport.startsWith("jsr:") ||
              parentImport.startsWith("http://") ||
              parentImport.startsWith("https://")
            ) {
              // 提取子路径（如 "chart/auto" -> "auto"）
              const subPath = args.path.substring(parentPackage.length + 1);
              // 构建完整的导入路径
              let fullImportPath: string;
              if (
                parentImport.startsWith("npm:") ||
                parentImport.startsWith("jsr:")
              ) {
                // createJSRResolverPlugin 主要用于服务端，但为了支持客户端渲染，需要检查
                // 由于 createJSRResolverPlugin 没有 isServerRender 参数，这里返回 undefined
                // 让 createImportReplacerPlugin 处理（它会在后面执行，但通过 filter 优先级可以处理）
                // 实际上，由于插件执行顺序，createJSRResolverPlugin 先执行，所以这里需要返回 undefined
                // 让 createImportReplacerPlugin 的 onResolve({ filter: /.*/ }) 处理
                return undefined;
              } else {
                // http:// 或 https://，直接拼接子路径
                fullImportPath = `${parentImport}/${subPath}`;
                // 返回转换后的完整路径，标记为 external
                return {
                  path: fullImportPath,
                  external: true,
                };
              }
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
            } catch (_error) {
              // 如果解析失败，返回错误
              return {
                errors: [{
                  text:
                    `Failed to resolve subpath "${args.path}" from parent package "${parentPackage}": ${
                      _error instanceof Error ? _error.message : String(_error)
                    }`,
                }],
              };
            }
          }
          // 只有当父包在 external 列表中时，才将子路径标记为 external
          // 如果父包不在 external 列表中，子路径应该被打包
          if (externalPackages.includes(parentPackage)) {
            return {
              path: args.path,
              external: true,
            };
          }
          // 如果父包不在 import map 中，尝试通过 Deno 解析来判断是否是 npm/jsr 包
          // 如果是，应该标记为 external，让 Deno 运行时处理
          try {
            const resolved = await import.meta.resolve(args.path);
            // 如果解析成功，说明它是一个有效的 npm/jsr 包，应该标记为 external
            // 检查解析后的路径是否是 npm: 或 jsr: 协议
            if (resolved.startsWith("npm:") || resolved.startsWith("jsr:")) {
              return {
                path: args.path,
                external: true,
              };
            }
            // 如果是 file:// 协议，说明是本地路径，应该被打包
            // 将 file:// URL 转换为绝对路径
            if (resolved.startsWith("file://")) {
              const url = new URL(resolved);
              return {
                path: url.pathname,
              };
            }
            // 其他情况（如 http:），标记为 external
            return {
              path: args.path,
              external: true,
            };
          } catch (_error) {
            // 如果解析失败，假设它是一个 npm 包，标记为 external
            // 让 Deno 运行时处理，如果确实不存在，运行时会有更清晰的错误提示
            return {
              path: args.path,
              external: true,
            };
          }
        }
        return undefined; // 让其他处理器处理
      });

      // 处理 @ 开头的子路径导入（如 @scope/package/subpath）
      // 处理其他 @scope/package/subpath 格式的导入
      // 排除 @dreamer/dweb/*，因为它有专门的处理逻辑（在下面）
      build.onResolve({ filter: /^@[^/]+\/[^/]+\/.+/ }, (args) => {
        // 排除所有 @dreamer/dweb/* 子路径，让专门处理器处理
        if (args.path.startsWith("@dreamer/dweb/")) {
          return undefined;
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
          // 如果是本地路径，不应该在这里处理，应该让专门处理器处理
          // 但如果是 HTTP URL，直接标记为 external
          if (
            importValue.startsWith("http://") ||
            importValue.startsWith("https://")
          ) {
            return {
              path: importValue,
              external: true,
            };
          }
          // 本地路径：如果是 @dreamer/dweb/*，让专门处理器处理
          if (args.path.startsWith("@dreamer/dweb/")) {
            return undefined;
          }
          // 其他本地路径，直接标记为 external（让浏览器通过 import map 解析）
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

      // 处理普通文件中的相对路径导入（服务端渲染时需要打包）
      // 确保相对路径被正确解析为绝对路径，以便 esbuild 能够打包
      build.onResolve({ filter: /^\.\.?\/.*/ }, async (args) => {
        // 跳过已经在其他 namespace 中处理的相对路径
        if (args.namespace && args.namespace !== "file") {
          return undefined;
        }

        // 解析相对路径为绝对路径
        try {
          // 使用 importer 或 resolveDir 来确定基础目录
          // args.importer 是导入该模块的文件路径（sourcefile）
          // args.resolveDir 是解析目录（resolveDir）
          const importerDir = args.importer
            ? path.dirname(args.importer)
            : (args.resolveDir || cwd);
          const resolvedPath = path.isAbsolute(args.path)
            ? args.path
            : path.resolve(importerDir, args.path);

          // 检查文件是否存在，如果不存在，尝试添加扩展名
          try {
            await Deno.stat(resolvedPath);
            return {
              path: resolvedPath,
              external: false, // 明确标记为不 external，强制打包
            };
          } catch {
            // 尝试添加 .ts 或 .tsx 扩展名
            const ext = path.extname(resolvedPath);
            if (!ext || ext === "") {
              const tsxPath = `${resolvedPath}.tsx`;
              try {
                await Deno.stat(tsxPath);
                return {
                  path: tsxPath,
                  external: false,
                };
              } catch {
                const tsPath = `${resolvedPath}.ts`;
                try {
                  await Deno.stat(tsPath);
                  return {
                    path: tsPath,
                    external: false,
                  };
                } catch {
                  // 文件不存在，返回 undefined 让 esbuild 处理错误
                  return undefined;
                }
              }
            }
            return undefined;
          }
        } catch (_error) {
          // 解析失败，返回 undefined 让 esbuild 处理
          return undefined;
        }
      });

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
  /** 是否为服务端渲染（默认 false，用于区分服务端渲染和普通服务端构建） */
  isServerRender?: boolean;
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
    isServerBuild: explicitIsServerBuild,
    isServerRender = false,
    minify = false,
    sourcemap = false,
    keepNames = false,
    legalComments = "none",
    externalPackages,
    plugins = [],
  } = options;

  // 根据 isServerRender 独立判断编译行为
  // isServerRender 和 bundleClient 是"或者"关系：只要其中一个为 true，就打包
  // 服务端渲染时：需要打包所有相对路径和路径别名，但 Preact 等外部依赖仍保持 external
  const bundleClientFinal = bundleClient || isServerRender;

  // isServerBuild 的判断：
  // - 如果 isServerRender 为 true，设置为 false 确保打包
  // - 否则使用原有逻辑
  const isServerBuildFinal = isServerRender
    ? false // 服务端渲染时，设置为 false 确保打包
    : (explicitIsServerBuild ?? !bundleClient);

  // 如果没有提供外部依赖列表，自动生成
  // 服务端渲染时，传递给 getExternalPackages 的 isServerBuild 参数应该是 false
  const finalExternalPackages = externalPackages ??
    getExternalPackages(
      importMap,
      bundleClientFinal,
      false,
      isServerBuildFinal,
    );

  // 智能注入框架默认依赖（如果 import map 中缺失）
  // 检查 importMap 中是否已有相关依赖，如果没有则使用默认值
  injectDefaultDependencies(importMap);

  // 创建导入替换插件（在编译时直接替换代码中的依赖导入）
  // 服务端构建时，preact 相关依赖保持原始导入，不转换为 HTTP URL
  // 服务端渲染时，需要打包所有相对路径和路径别名，但 Preact 等外部依赖仍保持 external
  const importReplacerPlugin = createImportReplacerPlugin(
    importMap,
    isServerBuildFinal, // 使用计算后的 isServerBuildFinal 值
    cwd,
    finalExternalPackages,
    isServerRender, // 传递 isServerRender 参数
  );

  // 创建 JSR 解析插件
  const jsrResolverPlugin = createJSRResolverPlugin(
    importMap,
    cwd,
    finalExternalPackages,
    isServerBuildFinal,
    isServerRender,
  );

  // 构建 alias 配置
  const alias = buildAliasConfig(importMap, cwd);

  // 确保 chart 及其子路径也被标记为 external（如果 chart 在 importMap 中）
  // 这样 chart/auto 等子路径也会被正确标记为 external
  const additionalExternals: string[] = [];
  if ("chart" in importMap) {
    additionalExternals.push("chart", "chart/");
  }

  // 执行构建
  // 使用导入替换插件在编译时替换依赖导入，然后使用 jsrResolverPlugin 处理其他模块解析
  // 服务端渲染时，确保 bundle: true 以打包所有相对路径和路径别名
  const baseConfig = getBaseConfig();
  const result = await esbuild.build({
    stdin: {
      contents: code,
      sourcefile,
      resolveDir,
      loader,
    },
    ...baseConfig,
    bundle: isServerRender ? true : baseConfig.bundle, // 服务端渲染时强制启用 bundle
    minify,
    sourcemap,
    keepNames,
    legalComments,
    external: [...finalExternalPackages, ...additionalExternals, "node:*"],
    // 优化：根据构建类型设置 platform，提高构建性能
    platform: isServerBuildFinal ? "node" : "browser",
    // 优化：减少日志输出，提高性能（开发环境可以设置为 "info" 或 "debug"）
    logLevel: "warning",
    // 插件执行顺序很重要：jsrResolverPlugin 先处理相对路径和路径别名，然后 importReplacerPlugin 处理外部依赖
    plugins: [jsrResolverPlugin, importReplacerPlugin, ...plugins],
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
    isServerRender = false,
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

  // 根据 isServerRender 独立判断编译行为
  // isServerRender 和 bundleClient 是"或者"关系：只要其中一个为 true，就打包
  // 服务端渲染时：需要打包所有相对路径和路径别名，但 Preact 等外部依赖仍保持 external
  const bundleClientFinal = bundleClient || isServerRender;

  // isServerBuild 的判断：
  // - 如果 isServerRender 为 true，设置为 false 确保打包
  // - 否则使用原有逻辑
  const isServerBuildFinal = isServerRender
    ? false // 服务端渲染时，设置为 false 确保打包
    : (explicitIsServerBuild ?? !bundleClient);

  // 如果没有提供外部依赖列表，自动生成
  // 服务端渲染时，传递给 getExternalPackages 的 isServerBuild 参数应该是 false
  const finalExternalPackages = externalPackages ??
    getExternalPackages(
      importMap,
      bundleClientFinal,
      false,
      isServerBuildFinal,
    );

  // 智能注入框架默认依赖（如果 import map 中缺失）
  // 检查 importMap 中是否已有相关依赖，如果没有则使用默认值
  injectDefaultDependencies(importMap);

  // 创建导入替换插件（在编译时直接替换代码中的依赖导入）
  // 服务端构建时，preact 相关依赖保持原始导入，不转换为 HTTP URL
  // 服务端渲染时，需要打包所有相对路径和路径别名，但 Preact 等外部依赖仍保持 external
  const importReplacerPlugin = createImportReplacerPlugin(
    importMap,
    isServerBuildFinal, // 使用计算后的 isServerBuildFinal 值
    cwd,
    finalExternalPackages,
    isServerRender, // 传递 isServerRender 参数
  );

  // 创建 JSR 解析插件
  const jsrResolverPlugin = createJSRResolverPlugin(
    importMap,
    cwd,
    finalExternalPackages,
    isServerBuildFinal,
    isServerRender,
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
    external: [...finalExternalPackages, "node:*"],
    // 优化：根据构建类型设置 platform，提高构建性能
    platform: isServerBuildFinal ? "node" : "browser",
    // 优化：减少日志输出，提高性能（开发环境可以设置为 "info" 或 "debug"）
    logLevel: "warning",
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

/**
 * 构建系统模块
 * 提供生产环境代码编译、打包和优化
 */

import type { AppConfig } from "../types/index.ts";
import { normalizeRouteConfig } from "../core/config.ts";
import { ensureDir } from "@std/fs/ensure_dir";
import { walk } from "@std/fs/walk";
import { PluginManager } from "../core/plugin.ts";
import { crypto } from "@std/crypto";
import * as path from "@std/path";
import * as esbuild from "esbuild";
import { logger } from "../utils/logger.ts";
import { removeLoadOnlyImports } from "../utils/module.ts";

/**
 * 清空目录
 * @param dirPath 目录路径
 */
async function clearDirectory(dirPath: string): Promise<void> {
  try {
    // 检查目录是否存在
    let stat;
    try {
      stat = await Deno.stat(dirPath);
    } catch {
      // 目录不存在，直接返回
      return;
    }

    if (!stat.isDirectory) {
      // 不是目录，直接返回
      return;
    }

    // 删除目录中的所有内容
    try {
      for await (const entry of walk(dirPath, { includeDirs: false })) {
        if (entry.isFile) {
          try {
            await Deno.remove(entry.path);
          } catch {
            // 忽略单个文件删除错误
          }
        }
      }

      // 删除所有子目录
      for await (const entry of walk(dirPath, { includeFiles: false })) {
        if (entry.isDirectory && entry.path !== dirPath) {
          try {
            await Deno.remove(entry.path, { recursive: true });
          } catch {
            // 忽略删除错误
          }
        }
      }

      logger.info(`已清空目录`, { path: dirPath });
    } catch (_error) {
      // 如果 walk 失败（可能是目录结构有问题），尝试直接删除整个目录后重建
      try {
        await Deno.remove(dirPath, { recursive: true });
        await ensureDir(dirPath);
        logger.info(`已清空并重建目录`, { path: dirPath });
      } catch (removeError) {
        logger.warn(`清空目录失败`, { path: dirPath, error: removeError });
      }
    }
  } catch (error) {
    logger.warn(`清空目录失败`, { path: dirPath, error });
  }
}

/**
 * 压缩静态资源（图片、字体等）
 * @param inputPath 输入文件路径
 * @param outputPath 输出文件路径
 * @param ext 文件扩展名
 * @param quality 压缩质量（0-100，仅用于图片）
 * @returns 是否成功压缩（如果返回 false，应该直接复制原文件）
 */
async function compressAsset(
  inputPath: string,
  outputPath: string,
  ext: string,
  quality: number,
): Promise<boolean> {
  try {
    // 图片压缩（支持常见格式）
    const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
    if (imageExts.includes(ext.toLowerCase())) {
      return await compressImage(
        inputPath,
        outputPath,
        ext.toLowerCase(),
        quality,
      );
    }

    // 字体压缩（子集化需要外部工具，这里只做基础优化）
    const fontExts = [".woff", ".woff2", ".ttf", ".otf", ".eot"];
    if (fontExts.includes(ext.toLowerCase())) {
      // 字体压缩需要专门的工具，暂时直接复制
      // 未来可以集成 fontmin 或类似工具
      return false;
    }

    // 其他格式不支持压缩
    return false;
  } catch (error) {
    logger.warn(`压缩资源失败`, { path: inputPath, error });
    return false;
  }
}

/**
 * 压缩图片
 * 注意：Deno 环境下图片压缩需要外部库，这里提供基础框架
 * 实际压缩可以通过插件或外部工具实现
 * @param inputPath 输入文件路径
 * @param outputPath 输出文件路径
 * @param ext 文件扩展名
 * @param quality 压缩质量（0-100）
 * @returns 是否成功压缩
 */
async function compressImage(
  inputPath: string,
  outputPath: string,
  ext: string,
  _quality: number,
): Promise<boolean> {
  try {
    // 读取原始图片
    const imageData = await Deno.readFile(inputPath);

    // SVG 文件：简单优化（移除注释、空白等）
    if (ext === ".svg") {
      const svgContent = new TextDecoder().decode(imageData);
      // 简单的 SVG 优化：移除注释、多余空白
      const optimized = svgContent
        .replace(/<!--[\s\S]*?-->/g, "") // 移除注释
        .replace(/\s+/g, " ") // 压缩空白
        .replace(/>\s+</g, "><") // 移除标签间的空白
        .trim();

      await Deno.writeTextFile(outputPath, optimized);
      return true;
    }

    // 其他图片格式（JPG, PNG, WebP, GIF）
    // 注意：Deno 原生不支持图片压缩，需要：
    // 1. 使用外部工具（如 sharp、imagemin）
    // 2. 通过插件系统实现
    // 3. 或调用系统命令（如 ImageMagick、pngquant）

    // 当前实现：对于非 SVG 图片，如果文件已经很小（< 50KB），直接复制
    // 否则提示需要外部工具
    if (imageData.length < 50 * 1024) {
      // 小文件直接复制（可能已经优化过）
      return false; // 返回 false 让调用者直接复制
    }

    // 大文件：提示需要外部压缩工具
    // 在实际项目中，可以通过插件或配置外部工具来实现
    logger.warn(`图片较大，建议使用外部工具压缩`, {
      path: inputPath,
      size: `${(imageData.length / 1024).toFixed(2)}KB`,
    });
    return false; // 暂时不压缩，直接复制
  } catch (error) {
    logger.warn(`图片压缩失败`, { path: inputPath, error });
    return false;
  }
}

/**
 * 计算文件内容的 hash 值
 * @param content 文件内容
 * @returns hash 字符串（前 10 个字符）
 *
 * 说明：10 个十六进制字符 = 40 位 = 2^40 ≈ 1.1 万亿种可能组合
 * 对于一般项目（几千到几万个文件），碰撞概率极低（< 0.0001%）
 * 即使有 10 万个文件，碰撞概率也远低于 0.01%
 */
async function calculateHash(content: string | Uint8Array): Promise<string> {
  let data: Uint8Array;

  if (typeof content === "string") {
    data = new TextEncoder().encode(content);
  } else {
    // 确保是 Uint8Array 类型
    data = content instanceof Uint8Array ? content : new Uint8Array(content);
  }

  // 使用 crypto.subtle.digest 计算 hash
  // 创建一个新的 ArrayBuffer 来避免类型问题
  const buffer = new ArrayBuffer(data.length);
  const view = new Uint8Array(buffer);
  view.set(data);

  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  // 返回前 10 个字符作为文件名 hash
  return hashHex.substring(0, 15);
}

/**
 * 计算源文件的 hash（用于缓存检查）
 * 基于文件内容和修改时间
 * @param filePath 文件路径
 * @returns hash 字符串
 */
async function calculateSourceHash(filePath: string): Promise<string> {
  try {
    const fileContent = await Deno.readFile(filePath);
    const fileStat = await Deno.stat(filePath);
    // 结合文件内容和修改时间计算 hash
    const combinedData = new TextEncoder().encode(
      `${fileContent.length}-${fileStat.mtime?.getTime() || 0}`,
    );
    const buffer = new ArrayBuffer(combinedData.length);
    const view = new Uint8Array(buffer);
    view.set(combinedData);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return hashHex.substring(0, 10);
  } catch {
    // 如果文件不存在或读取失败，返回空字符串（强制重新编译）
    return "";
  }
}

/**
 * 检查文件是否需要重新编译（基于缓存）
 * @param filePath 源文件路径
 * @param outDir 输出目录
 * @param sourceHash 源文件 hash
 * @returns 如果缓存有效返回缓存的文件名，否则返回 null
 */
async function checkBuildCache(
  _filePath: string,
  outDir: string,
  sourceHash: string,
): Promise<string | null> {
  try {
    // 生成预期的输出文件名（仅使用 hash）
    const hashName = `${sourceHash}.js`;
    const outputPath = path.join(outDir, hashName);

    // 检查输出文件是否存在
    try {
      await Deno.stat(outputPath);
      // 文件存在，缓存有效
      return hashName;
    } catch {
      // 文件不存在，需要重新编译
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * 创建 JSR URL 解析插件（用于打包 @dreamer/dweb/client）
 * @param importMap import map 配置
 * @param cwd 工作目录
 * @returns esbuild 插件
 */
function createJSRResolverPlugin(
  importMap: Record<string, string>,
  cwd: string,
): esbuild.Plugin {
  return {
    name: "jsr-resolver",
    setup(build: esbuild.PluginBuild) {
      // 解析 @dreamer/dweb/client（支持 JSR URL 和本地路径）
      // 必须在所有其他解析器之前执行，确保能拦截到导入
      build.onResolve({ filter: /^@dreamer\/dweb\/client$/ }, (_args) => {
        const clientImport = importMap["@dreamer/dweb/client"];
        if (!clientImport) {
          return undefined; // 让 esbuild 使用默认解析
        }

        // 如果是本地路径，解析为绝对路径
        if (!clientImport.startsWith("jsr:") && !clientImport.startsWith("http")) {
          const resolvedPath = path.isAbsolute(clientImport)
            ? clientImport
            : path.resolve(cwd, clientImport);
          return {
            path: resolvedPath,
            external: false, // 明确标记为不 external，确保被打包
          };
        }

        // 如果是 JSR URL，解析为实际的 HTTP URL
        if (clientImport.startsWith("jsr:")) {
          try {
            // 直接手动构建 JSR URL，不依赖 import.meta.resolve
            // 因为在 build 时，import.meta.resolve 可能无法正确解析 JSR URL
            const jsrPath = clientImport.replace(/^jsr:/, "");
            const jsrMatch = jsrPath.match(/^@([\w-]+)\/([\w-]+)@([\d.]+)\/(.+)$/);
            if (!jsrMatch) {
              return undefined;
            }
            
            const [, scope, packageName, version, subPath] = jsrMatch;
            let actualSubPath = subPath;
            if (!actualSubPath.startsWith("src/") && !actualSubPath.includes("/")) {
              actualSubPath = `src/${subPath}.ts`;
            } else if (!actualSubPath.endsWith(".ts") && !actualSubPath.endsWith(".tsx")) {
              actualSubPath = `${actualSubPath}.ts`;
            }
            const resolvedUrl = `https://jsr.io/@${scope}/${packageName}/${version}/${actualSubPath}`;
            
            return {
              path: resolvedUrl,
              namespace: "http-url",
              external: false, // 明确标记为不 external，确保被打包
            };
          } catch {
            return undefined; // 解析失败，使用默认行为
          }
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
 * 编译单个文件并生成 hash 文件名（扁平化输出）
 * 支持构建缓存，如果源文件未变化则跳过编译
 * 会生成两个版本：服务端版本（包含 load 函数）和客户端版本（移除 load 函数）
 * @param filePath 源文件路径（绝对路径）
 * @param outDir 输出目录（绝对路径，扁平化输出）
 * @param fileMap 文件映射表（原始路径 -> hash 文件名）
 * @param useCache 是否使用缓存（默认 true）
 * @param target 编译目标：'server' | 'client' | 'both'（默认 'both'）
 * @returns 编译后的文件路径和 hash 文件名
 */
async function compileFile(
  filePath: string,
  outDir: string,
  fileMap: Map<string, string>,
  useCache: boolean = true,
  target: "server" | "client" | "both" = "both",
): Promise<{ outputPath: string; hashName: string; cached: boolean }> {
  try {
    // 确保使用绝对路径
    const absoluteFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(Deno.cwd(), filePath);
    const absoluteOutDir = path.isAbsolute(outDir)
      ? outDir
      : path.resolve(Deno.cwd(), outDir);

    // 根据目标创建不同的输出目录
    // 注意：如果 target 是 'server' 或 'client'，outDir 已经是正确的目录了，不需要再创建子目录
    // 只有当 target 是 'both' 时，才需要在 outDir 下创建 server 和 client 子目录
    let serverOutDir: string;
    let clientOutDir: string;

    if (target === "server") {
      // target 是 'server'，直接使用 outDir
      serverOutDir = absoluteOutDir;
      clientOutDir = absoluteOutDir; // 不会使用，但需要定义
      await ensureDir(serverOutDir);
    } else if (target === "client") {
      // target 是 'client'，直接使用 outDir
      serverOutDir = absoluteOutDir; // 不会使用，但需要定义
      clientOutDir = absoluteOutDir;
      await ensureDir(clientOutDir);
    } else {
      // target 是 'both'，需要在 outDir 下创建 server 和 client 子目录
      serverOutDir = path.join(absoluteOutDir, "server");
      clientOutDir = path.join(absoluteOutDir, "client");
      await ensureDir(serverOutDir);
      await ensureDir(clientOutDir);
    }

    const ext = path.extname(filePath);

    // 检查构建缓存（分别检查 server 和 client 目录）
    if (useCache) {
      const sourceHash = await calculateSourceHash(absoluteFilePath);
      if (target === "server" || target === "both") {
        const cachedHashName = await checkBuildCache(
          absoluteFilePath,
          serverOutDir,
          sourceHash,
        );
        if (cachedHashName) {
          const cachedOutputPath = path.join(serverOutDir, cachedHashName);
          fileMap.set(filePath, `server/${cachedHashName}`);
          // 如果 target 是 both，还需要检查 client 缓存
          if (target === "both") {
            const clientCachedHashName = await checkBuildCache(
              absoluteFilePath,
              clientOutDir,
              sourceHash,
            );
            if (clientCachedHashName) {
              fileMap.set(
                `${filePath}.client`,
                `client/${clientCachedHashName}`,
              );
              return {
                outputPath: cachedOutputPath,
                hashName: `server/${cachedHashName}`,
                cached: true,
              };
            }
          } else {
            return {
              outputPath: cachedOutputPath,
              hashName: `server/${cachedHashName}`,
              cached: true,
            };
          }
        }
      }
      if (target === "client") {
        const cachedHashName = await checkBuildCache(
          absoluteFilePath,
          clientOutDir,
          sourceHash,
        );
        if (cachedHashName) {
          const cachedOutputPath = path.join(clientOutDir, cachedHashName);
          fileMap.set(filePath, `client/${cachedHashName}`);
          return {
            outputPath: cachedOutputPath,
            hashName: `client/${cachedHashName}`,
            cached: true,
          };
        }
      }
    }

    // 如果是 TSX/TS 文件，使用 esbuild 打包（包含所有依赖）
    if (ext === ".tsx" || ext === ".ts") {
      // 读取源代码
      const sourceCode = await Deno.readTextFile(absoluteFilePath);

      // 使用 esbuild.build 进行打包（会将所有静态导入打包到一个文件）
      // 注意：只打包项目内的相对路径导入，不打包外部依赖（如 @dreamer/dweb）
      const cwd = Deno.cwd();

      // 读取 deno.json 获取 import map（用于解析外部依赖）
      let importMap: Record<string, string> = {};
      try {
        const denoJsonPath = path.join(cwd, "deno.json");
        const denoJsonContent = await Deno.readTextFile(denoJsonPath);
        const denoJson = JSON.parse(denoJsonContent);
        if (denoJson.imports) {
          importMap = denoJson.imports;
        }
      } catch {
        // deno.json 不存在或解析失败，使用空 import map
      }

      // 收集所有外部依赖（从 import map 中提取）
      const externalPackages: string[] = [
        "@dreamer/dweb",
        "preact",
        "preact-render-to-string",
      ];

      // 从 import map 中添加所有外部依赖
      // 注意：@dreamer/dweb/client 会被打包，不添加到 external
      for (const [key, value] of Object.entries(importMap)) {
        // @dreamer/dweb/client 需要被打包，不添加到 external
        if (key === "@dreamer/dweb/client") {
          continue;
        }
        if (
          value.startsWith("jsr:") || value.startsWith("npm:") ||
          value.startsWith("http")
        ) {
          externalPackages.push(key);
        }
      }

      // 创建 JSR 解析插件
      const jsrResolverPlugin = createJSRResolverPlugin(importMap, cwd);

      // 生成服务端版本（包含 load 函数）
      let serverCompiledContent: string | null = null;
      if (target === "server" || target === "both") {
        // 使用原始源代码编译（包含 load 函数）
        const result = await esbuild.build({
          entryPoints: [absoluteFilePath],
          bundle: true, // ✅ 打包所有依赖（包括相对路径导入 ../ 和 ./）
          format: "esm",
          target: "esnext",
          jsx: "automatic",
          jsxImportSource: "preact",
          minify: true, // ✅ 压缩代码
          keepNames: true, // ✅ 保留导出名称（确保 load 方法名不被压缩）
          treeShaking: true, // ✅ Tree-shaking
          legalComments: "none", // ✅ 移除注释
          write: false, // 不写入文件，我们手动处理
          external: externalPackages, // 外部依赖不打包（保持 import 语句）
          plugins: [jsrResolverPlugin], // 添加 JSR 解析插件
          // 设置 import map（用于解析外部依赖）
          // 注意：只对本地路径使用 alias，JSR/NPM/HTTP 导入已经在 external 中，不需要 alias
          // 相对路径导入（../ 和 ./）不会被 alias 处理，由 esbuild 自动解析和打包
          alias: Object.fromEntries(
            Object.entries(importMap)
              .filter(
                ([key, value]) =>
                  // 排除所有 @dreamer/dweb 相关的导入（由插件处理或保持为外部依赖）
                  !key.startsWith("@dreamer/dweb") &&
                  !value.startsWith("jsr:") && !value.startsWith("npm:") &&
                  !value.startsWith("http")
              )
              .map(([key, value]) => [
                key,
                path.resolve(cwd, value),
              ]),
          ),
        });

        if (!result.outputFiles || result.outputFiles.length === 0) {
          throw new Error(`esbuild 打包结果为空: ${filePath}`);
        }

        serverCompiledContent = result.outputFiles[0].text;

        // 计算 hash（用于缓存）
        const hash = await calculateHash(serverCompiledContent);
        // 生成文件名（仅使用 hash）
        const hashName = `${hash}.js`;
        const serverOutputPath = path.join(serverOutDir, hashName);

        // 确保目录存在（虽然已经创建，但为了安全再次确保）
        await ensureDir(path.dirname(serverOutputPath));

        // 写入服务端版本（包含 load 函数）
        await Deno.writeTextFile(serverOutputPath, serverCompiledContent);

        // 记录映射关系
        fileMap.set(filePath, `server/${hashName}`);
      }

      // 生成客户端版本（先移除 load 函数，再编译）
      let clientCompiledContent: string | null = null;
      if (target === "client" || target === "both") {
        // 先对源代码执行 removeLoadOnlyImports（移除 load 函数和只在 load 中使用的导入）
        const clientSourceCode = removeLoadOnlyImports(sourceCode);

        // 使用 stdin 选项直接传入代码内容，无需临时文件
        // resolveDir 设置为原始文件所在目录，用于解析相对路径导入
        const originalDir = path.dirname(absoluteFilePath);
        const originalBasename = path.basename(absoluteFilePath);

        // 根据文件扩展名确定 loader（esbuild 需要知道文件类型才能正确解析 TypeScript/JSX）
        const loader = ext === ".tsx" ? "tsx" : "ts";

        const result = await esbuild.build({
          stdin: {
            contents: clientSourceCode,
            sourcefile: originalBasename, // 用于错误报告
            resolveDir: originalDir, // 用于解析相对路径导入
            loader: loader, // 指定文件类型，确保 TypeScript/JSX 语法被正确解析
          },
          bundle: true, // ✅ 打包所有依赖（包括相对路径导入 ../ 和 ./）
          format: "esm",
          target: "esnext",
          jsx: "automatic",
          jsxImportSource: "preact",
          minify: true, // ✅ 压缩代码
          keepNames: true, // ✅ 保留导出名称
          treeShaking: true, // ✅ Tree-shaking
          legalComments: "none", // ✅ 移除注释
          write: false, // 不写入文件，我们手动处理
          external: externalPackages, // 外部依赖不打包（保持 import 语句）
          plugins: [jsrResolverPlugin], // 添加 JSR 解析插件
          // 设置 import map（用于解析外部依赖）
          alias: Object.fromEntries(
            Object.entries(importMap)
              .filter(
                ([key, value]) =>
                  // 排除所有 @dreamer/dweb 相关的导入（由插件处理或保持为外部依赖）
                  !key.startsWith("@dreamer/dweb") &&
                  !value.startsWith("jsr:") && !value.startsWith("npm:") &&
                  !value.startsWith("http")
              )
              .map(([key, value]) => [
                key,
                path.resolve(cwd, value),
              ]),
          ),
        });

        if (!result.outputFiles || result.outputFiles.length === 0) {
          throw new Error(`esbuild 打包结果为空: ${filePath}`);
        }

        clientCompiledContent = result.outputFiles[0].text;

        // 计算客户端版本的 hash（内容不同，hash 也不同）
        const clientHash = await calculateHash(clientCompiledContent);
        const clientHashName = `${clientHash}.js`;
        const clientOutputPath = path.join(clientOutDir, clientHashName);

        // 确保目录存在（虽然已经创建，但为了安全再次确保）
        await ensureDir(path.dirname(clientOutputPath));

        // 写入客户端版本
        await Deno.writeTextFile(clientOutputPath, clientCompiledContent);

        // 记录映射关系（使用 .client 后缀区分）
        fileMap.set(`${filePath}.client`, `client/${clientHashName}`);
      }

      // 返回服务端版本的信息（如果存在）
      if (target === "server" || target === "both") {
        const hash = await calculateHash(serverCompiledContent!);
        const hashName = `${hash}.js`;
        const outputPath = path.join(serverOutDir, hashName);
        return { outputPath, hashName: `server/${hashName}`, cached: false };
      } else {
        // 只有客户端版本
        const clientHash = await calculateHash(clientCompiledContent!);
        const clientHashName = `${clientHash}.js`;
        const outputPath = path.join(clientOutDir, clientHashName);
        return {
          outputPath,
          hashName: `client/${clientHashName}`,
          cached: false,
        };
      }
    } else {
      // 非 TS/TSX 文件，直接读取并计算 hash
      const fileContent = await Deno.readFile(absoluteFilePath);
      const hash = await calculateHash(fileContent);
      const originalExt = ext || "";

      // 生成文件名（仅使用 hash，保留原始扩展名）
      const hashName = `${hash}${originalExt}`;
      const outputPath = path.join(absoluteOutDir, hashName);

      // 复制文件
      await Deno.writeFile(outputPath, fileContent);

      // 记录映射关系
      fileMap.set(filePath, hashName);

      return { outputPath, hashName, cached: false };
    }
  } catch (error) {
    logger.error(`编译文件失败`, error instanceof Error ? error : undefined, {
      path: filePath,
    });
    throw error;
  }
}

/**
 * 使用代码分割编译多个文件（提取共享代码到公共 chunk）
 * @param entryPoints 入口文件列表（绝对路径）
 * @param outDir 输出目录（绝对路径）
 * @param fileMap 文件映射表
 * @param cwd 工作目录
 * @param importMap import map 配置
 * @param externalPackages 外部依赖包列表
 * @returns 编译结果统计
 */
async function compileWithCodeSplitting(
  entryPoints: string[],
  outDir: string,
  fileMap: Map<string, string>,
  cwd: string,
  importMap: Record<string, string>,
  externalPackages: string[],
  jsrResolverPlugin: esbuild.Plugin,
): Promise<{ compiled: number; chunks: number }> {
  if (entryPoints.length === 0) {
    return { compiled: 0, chunks: 0 };
  }

  // 使用 esbuild 的代码分割功能
  const result = await esbuild.build({
    entryPoints: entryPoints,
    bundle: true,
    splitting: true, // 启用代码分割
    format: "esm",
    target: "esnext",
    jsx: "automatic",
    jsxImportSource: "preact",
    minify: true,
    treeShaking: true,
    legalComments: "none",
    outdir: outDir, // 输出到目录（代码分割需要）
    outbase: cwd, // 保持目录结构
    external: externalPackages,
    plugins: [jsrResolverPlugin], // 添加 JSR 解析插件
    // 只对本地路径使用 alias，JSR/NPM/HTTP 导入已经在 external 中，不需要 alias
    alias: Object.fromEntries(
      Object.entries(importMap)
        .filter(
          ([key, value]) =>
            // 排除所有 @dreamer/dweb 相关的导入（由插件处理或保持为外部依赖）
            !key.startsWith("@dreamer/dweb") &&
            !value.startsWith("jsr:") && !value.startsWith("npm:") &&
            !value.startsWith("http")
        )
        .map(([key, value]) => [
          key,
          path.resolve(cwd, value),
        ]),
    ),
    write: false, // 不写入文件，我们手动处理
  });

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error("esbuild 代码分割结果为空");
  }

  // 处理输出文件
  let compiled = 0;
  const chunkMap = new Map<string, string>(); // 原始路径 -> hash 文件名

  for (const outputFile of result.outputFiles) {
    const outputPath = outputFile.path;
    const content = outputFile.text;

    // 计算 hash
    const hash = await calculateHash(content);

    // 生成 hash 文件名（仅使用 hash，不包含路径前缀）
    // esbuild 输出的文件名格式：path/to/file.js
    // 我们直接使用 hash 作为文件名
    const hashName = `${hash}.js`;
    const finalOutputPath = path.join(outDir, hashName);

    // 写入文件
    await Deno.writeTextFile(finalOutputPath, content);

    // 记录映射关系（如果是入口文件）
    // esbuild 的代码分割会生成多个 chunk，我们需要识别哪些是入口文件
    // 通过比较输出路径和入口文件路径来判断
    const relativePath = path.relative(outDir, outputPath);
    for (const entryPoint of entryPoints) {
      const entryRelative = path.relative(cwd, entryPoint);
      const entryPathWithoutExt = entryRelative.replace(/\.(tsx?|jsx?)$/, "");
      // 检查输出路径是否包含入口文件的路径（用于识别入口文件对应的 chunk）
      if (relativePath.includes(entryPathWithoutExt.replace(/[\/\\]/g, "/"))) {
        fileMap.set(entryPoint, hashName);
        chunkMap.set(entryPoint, hashName);
        compiled++;
        break;
      }
    }
  }

  return { compiled, chunks: result.outputFiles.length };
}

/**
 * 编译目录中的所有文件（扁平化输出，使用 hash 文件名）
 * 支持并行编译、构建缓存和代码分割
 * @param srcDir 源目录（相对路径）
 * @param outDir 输出目录（相对路径，扁平化）
 * @param fileMap 文件映射表
 * @param extensions 要编译的文件扩展名
 * @param useCache 是否使用缓存（默认 true）
 * @param parallel 是否并行编译（默认 true，最多 10 个并发）
 * @param codeSplitting 是否启用代码分割（默认 false）
 * @param _minChunkSize 代码分割的最小 chunk 大小（字节，默认 20000，暂未使用，由 esbuild 自动处理）
 * @param target 编译目标：'server' | 'client' | 'both'（默认 'both'）
 */
async function compileDirectory(
  srcDir: string,
  outDir: string,
  fileMap: Map<string, string>,
  extensions: string[] = [".ts", ".tsx"],
  useCache: boolean = true,
  parallel: boolean = true,
  codeSplitting: boolean = false,
  _minChunkSize: number = 20000,
  target: "server" | "client" | "both" = "both",
): Promise<void> {
  // 转换为绝对路径
  const absoluteSrcDir = path.isAbsolute(srcDir)
    ? srcDir
    : path.resolve(Deno.cwd(), srcDir);
  const absoluteOutDir = path.isAbsolute(outDir)
    ? outDir
    : path.resolve(Deno.cwd(), outDir);

  const files: string[] = [];

  // 遍历目录收集文件
  for await (const entry of walk(absoluteSrcDir)) {
    if (entry.isFile) {
      const ext = path.extname(entry.path);
      if (extensions.includes(ext)) {
        files.push(entry.path);
      }
    }
  }

  logger.info(`找到文件需要编译`, { count: files.length });

  // 如果启用代码分割，使用批量编译
  if (codeSplitting && files.length > 1) {
    // 读取 deno.json 获取 import map
    const cwd = Deno.cwd();
    let importMap: Record<string, string> = {};
    try {
      const denoJsonPath = path.join(cwd, "deno.json");
      const denoJsonContent = await Deno.readTextFile(denoJsonPath);
      const denoJson = JSON.parse(denoJsonContent);
      if (denoJson.imports) {
        importMap = denoJson.imports;
      }
    } catch {
      // deno.json 不存在或解析失败，使用空 import map
    }

    // 收集外部依赖
    const externalPackages: string[] = [
      "@dreamer/dweb",
      "preact",
      "preact-render-to-string",
    ];
    // 从 import map 中添加所有外部依赖
    // 注意：@dreamer/dweb/client 会被打包，不添加到 external
    for (const [key, value] of Object.entries(importMap)) {
      // @dreamer/dweb/client 需要被打包，不添加到 external
      if (key === "@dreamer/dweb/client") {
        continue;
      }
      if (
        value.startsWith("jsr:") || value.startsWith("npm:") ||
        value.startsWith("http")
      ) {
        externalPackages.push(key);
      }
    }

    // 创建 JSR 解析插件
    const jsrResolverPlugin = createJSRResolverPlugin(importMap, cwd);

    // 使用代码分割编译所有文件
    console.log(`🔀 启用代码分割，批量编译 ${files.length} 个文件...`);
    const result = await compileWithCodeSplitting(
      files,
      absoluteOutDir,
      fileMap,
      cwd,
      importMap,
      externalPackages,
      jsrResolverPlugin,
    );
    console.log(
      `✅ 代码分割完成: ${result.compiled} 个入口文件, ${result.chunks} 个 chunk`,
    );
    return;
  }

  if (parallel && files.length > 1) {
    // 并行编译（根据 CPU 核心数动态调整并发数，优化构建速度）
    // 在 Deno 环境中，使用系统 CPU 核心数
    // 注意：需要传递 target 参数给 compileFile
    let cpuCount = 4; // 默认值
    try {
      // Deno 环境：尝试获取 CPU 核心数
      if (typeof Deno !== "undefined") {
        // Deno 没有直接获取 CPU 核心数的 API，使用环境变量或默认值
        const envCores = Deno.env.get("DENO_CPU_COUNT");
        if (envCores) {
          cpuCount = parseInt(envCores, 10) || 4;
        } else {
          // 使用合理的默认值（通常为 4-8）
          cpuCount = 4;
        }
      } else if (
        typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ) {
        // 浏览器环境
        cpuCount = navigator.hardwareConcurrency;
      }
    } catch {
      // 获取失败时使用默认值
      cpuCount = 4;
    }

    // 动态调整并发数：CPU 核心数的 2 倍，但不超过文件数量和最大限制
    const concurrency = Math.min(Math.max(cpuCount * 2, 4), files.length, 20); // 最多 20 个并发
    let cachedCount = 0;
    let compiledCount = 0;

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (file) => {
          const result = await compileFile(
            file,
            absoluteOutDir,
            fileMap,
            useCache,
            target,
          );
          if (result.cached) {
            cachedCount++;
          } else {
            compiledCount++;
          }
          return result;
        }),
      );
    }

    console.log(
      `✅ 编译完成: ${compiledCount} 个文件重新编译, ${cachedCount} 个文件使用缓存`,
    );
  } else {
    // 串行编译（用于调试或小文件数量）
    let cachedCount = 0;
    let compiledCount = 0;

    for (const file of files) {
      const result = await compileFile(
        file,
        absoluteOutDir,
        fileMap,
        useCache,
        target,
      );
      if (result.cached) {
        cachedCount++;
      } else {
        compiledCount++;
      }
    }

    console.log(
      `✅ 编译完成: ${compiledCount} 个文件重新编译, ${cachedCount} 个文件使用缓存`,
    );
  }
}

/**
 * 后处理：替换所有编译文件中的相对路径导入为编译后的文件名
 * @param outDir 输出目录
 * @param fileMap 文件映射表（原始路径 -> hash 文件名）
 */
async function postProcessImports(
  outDir: string,
  fileMap: Map<string, string>,
): Promise<void> {
  console.log("🔄 后处理：替换导入路径...");

  // 创建反向映射：原始路径 -> hash 文件名
  // 支持多种路径格式作为 key
  const pathToHashMap = new Map<string, string>();
  for (const [originalPath, hashName] of fileMap.entries()) {
    // 使用相对路径作为 key（相对于项目根目录）
    const relativePath = path.relative(Deno.cwd(), originalPath);
    pathToHashMap.set(relativePath, hashName);
    // 也支持绝对路径作为 key
    pathToHashMap.set(originalPath, hashName);
    // 标准化路径（统一使用正斜杠）
    pathToHashMap.set(relativePath.replace(/\\/g, "/"), hashName);
    pathToHashMap.set(originalPath.replace(/\\/g, "/"), hashName);
  }

  // 遍历所有编译后的 JS 文件（处理 server 和 client 两个目录）
  const absoluteOutDir = path.isAbsolute(outDir)
    ? outDir
    : path.resolve(Deno.cwd(), outDir);
  const serverOutDir = path.join(absoluteOutDir, "server");
  const clientOutDir = path.join(absoluteOutDir, "client");
  let processedCount = 0;
  let modifiedCount = 0;

  // 收集所有需要处理的文件（server 和 client 目录）
  const filesToProcess: Array<
    { path: string; originalPath: string; isClient: boolean }
  > = [];

  for (const [originalPath, hashName] of fileMap.entries()) {
    // 跳过客户端版本的映射（.client 后缀），这些会在处理原始路径时一起处理
    if (originalPath.endsWith(".client")) {
      continue;
    }

    // 只处理 TS/TSX 文件编译后的 JS 文件
    if (!originalPath.endsWith(".ts") && !originalPath.endsWith(".tsx")) {
      continue;
    }

    // 根据 hashName 判断是 server 还是 client
    if (hashName.startsWith("server/")) {
      const serverHashName = hashName.replace(/^server\//, "");
      const filePath = path.join(serverOutDir, serverHashName);
      // 检查文件是否存在
      try {
        await Deno.stat(filePath);
        filesToProcess.push({
          path: filePath,
          originalPath: originalPath,
          isClient: false,
        });
      } catch {
        // 文件不存在，跳过
        continue;
      }
    }

    // 查找对应的客户端版本
    const clientHashName = fileMap.get(`${originalPath}.client`);
    if (clientHashName && clientHashName.startsWith("client/")) {
      const clientHash = clientHashName.replace(/^client\//, "");
      const filePath = path.join(clientOutDir, clientHash);
      // 检查文件是否存在
      try {
        await Deno.stat(filePath);
        filesToProcess.push({
          path: filePath,
          originalPath: originalPath,
          isClient: true,
        });
      } catch {
        // 文件不存在，跳过
      }
    }
  }

  // 处理所有文件
  for (const { path: outputPath, originalPath, isClient } of filesToProcess) {
    try {
      // 再次检查文件是否存在（防止并发问题）
      try {
        await Deno.stat(outputPath);
      } catch {
        // 文件不存在，跳过
        continue;
      }

      // 读取编译后的文件内容
      let content = await Deno.readTextFile(outputPath);
      let modified = false;

      // 替换 import ... from '相对路径' 中的相对路径
      // 注意：压缩后的代码可能没有空格，所以正则表达式要更灵活
      // 匹配: from"../path" 或 from "../path" 或 from '../path'
      content = content.replace(
        /from\s*['"](\.\.?\/[^'"]+\.(tsx?|jsx?))['"]/g,
        (match, importPath) => {
          // 解析相对路径为绝对路径
          const originalDir = path.dirname(originalPath);
          const absoluteImportPath = path.resolve(originalDir, importPath);
          const relativeImportPath = path.relative(
            Deno.cwd(),
            absoluteImportPath,
          );

          // 标准化路径（统一使用正斜杠）
          const normalizedRelative = relativeImportPath.replace(/\\/g, "/");
          const normalizedAbsolute = absoluteImportPath.replace(/\\/g, "/");

          // 查找对应的 hash 文件名
          const hashFileName = pathToHashMap.get(normalizedRelative) ||
            pathToHashMap.get(relativeImportPath) ||
            pathToHashMap.get(normalizedAbsolute) ||
            pathToHashMap.get(absoluteImportPath);

          if (hashFileName) {
            modified = true;
            // 替换为相对路径（相对于当前目录，server 或 client）
            // 需要根据当前文件所在目录（server 或 client）来确定相对路径
            const currentDir = isClient ? "client" : "server";
            const targetDir = hashFileName.startsWith("server/")
              ? "server"
              : hashFileName.startsWith("client/")
              ? "client"
              : currentDir;
            const targetHashName = hashFileName.replace(
              /^(server|client)\//,
              "",
            );
            // 如果目标目录和当前目录相同，使用相对路径；否则需要跨目录引用
            const relativeModulePath = currentDir === targetDir
              ? `./${targetHashName}`
              : `../${targetDir}/${targetHashName}`;
            const quote = match.includes("'") ? "'" : '"';
            return `from ${quote}${relativeModulePath}${quote}`;
          }

          // 如果找不到映射，保持原样（可能是外部依赖或未编译的文件）
          return match;
        },
      );

      // 替换 import('相对路径') 动态导入中的相对路径
      content = content.replace(
        /import\s*\(\s*['"](\.\.?\/[^'"]+\.(tsx?|jsx?))['"]\s*\)/g,
        (match, importPath) => {
          const originalDir = path.dirname(originalPath);
          const absoluteImportPath = path.resolve(originalDir, importPath);
          const relativeImportPath = path.relative(
            Deno.cwd(),
            absoluteImportPath,
          );

          const normalizedRelative = relativeImportPath.replace(/\\/g, "/");
          const normalizedAbsolute = absoluteImportPath.replace(/\\/g, "/");

          const hashFileName = pathToHashMap.get(normalizedRelative) ||
            pathToHashMap.get(relativeImportPath) ||
            pathToHashMap.get(normalizedAbsolute) ||
            pathToHashMap.get(absoluteImportPath);

          if (hashFileName) {
            modified = true;
            // 替换为相对路径（动态导入也需要根据目录结构处理）
            const currentDir = isClient ? "client" : "server";
            const targetDir = hashFileName.startsWith("server/")
              ? "server"
              : hashFileName.startsWith("client/")
              ? "client"
              : currentDir;
            const targetHashName = hashFileName.replace(
              /^(server|client)\//,
              "",
            );
            const relativeModulePath = currentDir === targetDir
              ? `./${targetHashName}`
              : `../${targetDir}/${targetHashName}`;
            const quote = match.includes("'") ? "'" : '"';
            return `import(${quote}${relativeModulePath}${quote})`;
          }

          return match;
        },
      );

      // 如果内容被修改，重新写入文件
      if (modified) {
        await Deno.writeTextFile(outputPath, content);
        modifiedCount++;
      }
      processedCount++;
    } catch (error) {
      console.warn(`⚠️  后处理文件失败: ${outputPath}`, error);
    }
  }

  console.log(
    `✅ 导入路径替换完成: 处理 ${processedCount} 个文件，修改 ${modifiedCount} 个文件`,
  );
}

/**
 * 生成路由映射文件（路由路径 -> hash 文件名）
 * 分别生成 server 和 client 两个路由映射文件
 * @param fileMap 文件映射表
 * @param routesDir 路由目录
 * @param outDir 输出目录
 * @param apiDir API 目录（可选，默认为 routes/api）
 */
async function generateRouteMap(
  fileMap: Map<string, string>,
  routesDir: string,
  outDir: string,
  apiDir?: string,
): Promise<void> {
  const serverRouteMap: Record<string, string> = {};
  const clientRouteMap: Record<string, string> = {};

  // 标准化 API 目录路径
  const apiDirAbsolute = apiDir
    ? (path.isAbsolute(apiDir) ? apiDir : path.resolve(Deno.cwd(), apiDir))
    : path.resolve(Deno.cwd(), routesDir, "api");

  const routesDirAbsolute = path.resolve(Deno.cwd(), routesDir);
  // 注意：apiDirInRoutes 在此函数中未使用，但在 buildApp 函数中使用
  const _apiDirInRoutes =
    apiDirAbsolute.startsWith(routesDirAbsolute + path.SEPARATOR) ||
    apiDirAbsolute === routesDirAbsolute;

  // 遍历文件映射表，找出路由文件
  for (const [originalPath, hashName] of fileMap.entries()) {
    // 跳过客户端版本（.client 后缀）
    if (originalPath.endsWith(".client")) {
      continue;
    }

    const originalPathAbsolute = path.isAbsolute(originalPath)
      ? originalPath
      : path.resolve(Deno.cwd(), originalPath);

    // 判断是否是 API 路由文件
    const isApiRoute = originalPathAbsolute.startsWith(
      apiDirAbsolute + path.SEPARATOR,
    );

    // 判断是否是普通路由文件（在 routes 目录下，但不是 API 路由）
    const isPageRoute =
      originalPathAbsolute.startsWith(routesDirAbsolute + path.SEPARATOR) &&
      !isApiRoute;

    // 处理页面路由
    if (isPageRoute) {
      // 计算路由路径（从 routes 目录开始的相对路径）
      const routeRelativePath = path.relative(
        routesDirAbsolute,
        originalPathAbsolute,
      );

      // 移除扩展名，转换为路由路径
      const routePath = routeRelativePath
        .replace(/\.tsx?$/, "")
        .replace(/^_/, "/_")
        .replace(/\/index$/, "/")
        .replace(/\/$/, "");

      // 如果路由路径为空，设置为根路径
      const finalRoutePath = routePath || "/";

      // 根据 hashName 判断是 server 还是 client
      if (hashName.startsWith("server/")) {
        serverRouteMap[finalRoutePath] = hashName;
        // 查找对应的客户端版本
        const clientHashName = fileMap.get(`${originalPath}.client`);
        if (clientHashName && clientHashName.startsWith("client/")) {
          clientRouteMap[finalRoutePath] = clientHashName;
        }
      } else if (hashName.startsWith("client/")) {
        clientRouteMap[finalRoutePath] = hashName;
      }
    } // 处理 API 路由
    else if (isApiRoute) {
      // 计算路由路径（从 API 目录开始的相对路径）
      const apiRelativePath = path.relative(
        apiDirAbsolute,
        originalPathAbsolute,
      );

      // 移除扩展名，转换为路由路径
      const routePath = apiRelativePath
        .replace(/\.tsx?$/, "")
        .replace(/\/$/, "");

      // 加上 /api 前缀
      const finalRoutePath = `/api/${routePath}`;

      // 根据 hashName 判断是 server 还是 client
      if (hashName.startsWith("server/")) {
        serverRouteMap[finalRoutePath] = hashName;
        // 查找对应的客户端版本
        const clientHashName = fileMap.get(`${originalPath}.client`);
        if (clientHashName && clientHashName.startsWith("client/")) {
          clientRouteMap[finalRoutePath] = clientHashName;
        }
      } else if (hashName.startsWith("client/")) {
        clientRouteMap[finalRoutePath] = hashName;
      }
    }
  }

  // 写入服务端路由映射文件
  await Deno.writeTextFile(
    path.join(outDir, "server.json"),
    JSON.stringify(serverRouteMap, null, 2),
  );

  // 写入客户端路由映射文件
  await Deno.writeTextFile(
    path.join(outDir, "client.json"),
    JSON.stringify(clientRouteMap, null, 2),
  );

  console.log(
    `✅ 路由映射文件生成完成: server.json (${
      Object.keys(serverRouteMap).length
    } 个路由), client.json (${Object.keys(clientRouteMap).length} 个路由)`,
  );
}

/**
 * 构建项目
 * @param config 单应用配置对象（CLI 已处理多应用模式，传入的是单个应用的配置）
 */
export async function build(config: AppConfig): Promise<void> {
  await buildApp(config);
}

/**
 * 构建单应用
 */
async function buildApp(config: AppConfig): Promise<void> {
  if (!config.build) {
    throw new Error("构建配置 (build) 是必需的");
  }
  const outDir = config.build.outDir;

  console.log(`📦 构建到: ${outDir}`);

  // 0. 检查是否需要清空输出目录
  // 如果启用缓存，不清空目录（保留已编译的文件）
  const useCache = config.build?.cache !== false; // 默认启用缓存
  if (!useCache) {
    await clearDirectory(outDir);
  } else {
    // 只确保输出目录存在
    await ensureDir(outDir);
    console.log(`💾 启用构建缓存（增量构建）`);
  }

  // 文件映射表（原始路径 -> hash 文件名）
  const fileMap = new Map<string, string>();

  // 1. 复制静态资源（保持原文件名，不 hash 化）
  // 先复制所有文件（包括 CSS），Tailwind 插件构建时会覆盖 tailwind.css
  const staticDir = config.static?.dir || "assets";
  const staticOutDir = path.join(outDir, staticDir);
  const compressAssets = config.build?.compress === true;
  const imageQuality = config.build?.imageQuality || 80;

  try {
    await ensureDir(staticOutDir);

    let copiedCount = 0;
    let compressedCount = 0;

    // 遍历静态资源目录
    for await (const entry of walk(staticDir)) {
      if (entry.isFile) {
        const ext = path.extname(entry.path).toLowerCase();

        const relativePath = path.relative(staticDir, entry.path);
        const outputPath = path.join(staticOutDir, relativePath);
        const outputDir = path.dirname(outputPath);
        await ensureDir(outputDir);

        // 如果启用压缩，尝试压缩图片和字体
        if (compressAssets) {
          const compressed = await compressAsset(
            entry.path,
            outputPath,
            ext,
            imageQuality,
          );
          if (compressed) {
            compressedCount++;
          } else {
            // 压缩失败或不支持，直接复制
            await Deno.copyFile(entry.path, outputPath);
            copiedCount++;
          }
        } else {
          // 未启用压缩，直接复制
          await Deno.copyFile(entry.path, outputPath);
          copiedCount++;
        }
      }
    }

    if (compressAssets) {
      console.log(
        `✅ 静态资源处理完成 (${staticDir}): ${compressedCount} 个已压缩, ${copiedCount} 个已复制`,
      );
    } else {
      console.log(`✅ 复制静态资源完成 (${staticDir}): ${copiedCount} 个文件`);
    }
  } catch {
    // 静态资源目录不存在时忽略错误
  }

  // 2. 创建 server 和 client 目录
  const serverOutDir = path.join(outDir, "server");
  const clientOutDir = path.join(outDir, "client");
  await ensureDir(serverOutDir);
  await ensureDir(clientOutDir);

  // 3. 编译路由文件（分别编译到 server 和 client 目录）
  if (!config.routes) {
    throw new Error("路由配置 (routes) 是必需的");
  }
  const routeConfig = normalizeRouteConfig(config.routes);
  const routesDir = routeConfig.dir || "routes";
  const apiDir = routeConfig.apiDir || path.join(routesDir, "api");

  // 标准化路径（转换为绝对路径）
  const routesDirAbsolute = path.isAbsolute(routesDir)
    ? routesDir
    : path.resolve(Deno.cwd(), routesDir);
  const apiDirAbsolute = path.isAbsolute(apiDir)
    ? apiDir
    : path.resolve(Deno.cwd(), apiDir);

  // 判断 API 目录是否在 routes 目录下
  const apiDirInRoutes =
    apiDirAbsolute.startsWith(routesDirAbsolute + path.SEPARATOR) ||
    apiDirAbsolute === routesDirAbsolute;

  // 检查是否启用代码分割
  const codeSplitting = config.build?.split === true;
  const minChunkSize = config.build?.chunkSize || 20000;

  try {
    // 编译路由文件到 server 目录（包含 load 函数）
    await compileDirectory(
      routesDir,
      serverOutDir,
      fileMap,
      [".ts", ".tsx"],
      useCache,
      true,
      codeSplitting,
      minChunkSize,
      "server",
    );
    // 编译路由文件到 client 目录（移除 load 函数）
    await compileDirectory(
      routesDir,
      clientOutDir,
      fileMap,
      [".ts", ".tsx"],
      useCache,
      true,
      codeSplitting,
      minChunkSize,
      "client",
    );
    console.log(`✅ 编译路由文件完成 (${routesDir}) - server 和 client 版本`);
  } catch (error) {
    console.warn(`⚠️  路由目录编译失败: ${routesDir}`, error);
  }

  // 如果 API 目录不在 routes 目录下，单独编译 API 目录
  if (!apiDirInRoutes) {
    try {
      // 检查 API 目录是否存在
      const apiDirExists = await Deno.stat(apiDirAbsolute)
        .then(() => true)
        .catch(() => false);

      if (apiDirExists) {
        // 编译 API 文件到 server 目录（包含 load 函数）
        await compileDirectory(
          apiDir,
          serverOutDir,
          fileMap,
          [".ts", ".tsx"],
          useCache,
          true,
          codeSplitting,
          minChunkSize,
          "server",
        );
        // 编译 API 文件到 client 目录（移除 load 函数）
        await compileDirectory(
          apiDir,
          clientOutDir,
          fileMap,
          [".ts", ".tsx"],
          useCache,
          true,
          codeSplitting,
          minChunkSize,
          "client",
        );
        console.log(`✅ 编译 API 文件完成 (${apiDir}) - server 和 client 版本`);
      }
    } catch (error) {
      console.warn(`⚠️  API 目录编译失败: ${apiDir}`, error);
    }
  }

  // 4. 编译组件文件（组件通常只需要客户端版本，但为了兼容性也生成服务端版本）
  try {
    if (
      await Deno.stat("components")
        .then(() => true)
        .catch(() => false)
    ) {
      // 编译组件到 server 目录
      await compileDirectory(
        "components",
        serverOutDir,
        fileMap,
        [".ts", ".tsx"],
        useCache,
        true,
        codeSplitting,
        minChunkSize,
        "server",
      );
      // 编译组件到 client 目录
      await compileDirectory(
        "components",
        clientOutDir,
        fileMap,
        [".ts", ".tsx"],
        useCache,
        true,
        codeSplitting,
        minChunkSize,
        "client",
      );
      console.log("✅ 编译组件文件完成 (components) - server 和 client 版本");
    }
  } catch (error) {
    console.warn("⚠️  组件目录编译失败", error);
  }

  // 4. 配置文件不再复制到构建输出目录
  // 注意：以下文件不再复制：
  // - tailwind.config.ts (由 Tailwind 插件处理)
  // - deno.json (运行时从项目根目录读取)
  // - deno.lock (运行时从项目根目录读取)
  // - dweb.config.ts (运行时从项目根目录加载)

  console.log("✅ 跳过配置文件复制（运行时从项目根目录读取）");

  // 5. 不再复制 deno.json 到输出目录
  // 注意：运行时从项目根目录读取 deno.json，不需要复制到 dist 目录

  // 6. 创建插件管理器并执行构建钩子
  const pluginManager = new PluginManager();

  // 注册配置中的插件
  if (config.plugins) {
    pluginManager.registerMany(config.plugins);
  }

  // 执行插件构建钩子
  await pluginManager.executeOnBuild({
    outDir,
    staticDir: staticDir,
    isProduction: true,
  });

  // 7. 后处理：替换所有编译文件中的相对路径导入为编译后的文件名
  await postProcessImports(outDir, fileMap);

  // 8. 生成路由映射文件
  await generateRouteMap(fileMap, routesDir, outDir, routeConfig.apiDir);

  // 9. 不再生成服务器入口文件和构建信息
  // 注意：server.js 和 .build-info.json 不再生成，运行时使用 CLI 命令启动
  console.log(`📊 构建统计: 输出目录 ${outDir}, 共 ${fileMap.size} 个文件`);
  console.log(`🚀 启动命令: deno task start`);
}

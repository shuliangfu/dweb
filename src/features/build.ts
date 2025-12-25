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
import { logger } from "../utils/logger.ts";
import { removeLoadOnlyImports } from "../utils/module.ts";
import { buildFromEntryPoints, buildFromStdin } from "../utils/esbuild.ts";
import * as esbuild from "esbuild";
import { isMultiAppMode } from "../core/config.ts";

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
// JSR 解析插件已移至 utils/esbuild.ts

/**
 * 编译单个文件并生成 hash 文件名（扁平化输出）
 * 支持构建缓存，如果源文件未变化则跳过编译
 * 会生成两个版本：服务端版本（包含 load 函数）和客户端版本（移除 load 函数）
 * @param filePath 源文件路径（绝对路径）
 * @param outDir 输出目录（绝对路径，扁平化输出）
 * @param fileMap 文件映射表（原始路径 -> 输出文件名）
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

      // 读取 deno.json 或 deno.jsonc 获取 import map（用于解析外部依赖）
      let importMap: Record<string, string> = {};
      try {
        const { readDenoJson } = await import("../utils/file.ts");
        const denoJson = await readDenoJson(cwd);
        if (denoJson && denoJson.imports) {
          importMap = denoJson.imports;
        }
      } catch {
        // deno.json 或 deno.jsonc 不存在或解析失败，使用空 import map
      }

      // 生成服务端版本（包含 load 函数）
      let serverCompiledContent: string | null = null;
      if (target === "server" || target === "both") {
        // 使用原始源代码编译（包含 load 函数）
        const result = await buildFromEntryPoints([absoluteFilePath], {
          importMap,
          cwd,
          bundleClient: true,
          minify: true,
          keepNames: true,
          legalComments: "none",
        });

        if (!result.outputFiles || result.outputFiles.length === 0) {
          throw new Error(`esbuild 打包结果为空: ${filePath}`);
        }

        const serverCode = result.outputFiles[0].text;
        serverCompiledContent = serverCode;

        // 计算 hash（用于缓存）
        const hash = await calculateHash(serverCode);
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

        // 使用统一的构建函数
        const compiledCode = await buildFromStdin(
          clientSourceCode,
          originalBasename,
          originalDir,
          loader,
          {
            importMap,
            cwd,
            bundleClient: true,
            minify: true,
            keepNames: true,
            legalComments: "none",
          },
        );

        clientCompiledContent = compiledCode;

        // 计算客户端版本的 hash（内容不同，hash 也不同）
        const clientHash = await calculateHash(compiledCode);
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
/**
 * 使用代码分割编译多个文件（提取共享代码到公共 chunk）
 * @param entryPoints 入口文件列表（绝对路径）
 * @param outDir 输出目录（绝对路径）
 * @param fileMap 文件映射表
 * @param cwd 工作目录
 * @param importMap import map 配置
 * @param target 编译目标：'server' | 'client'（代码分割时不能是 'both'）
 * @returns 编译结果统计
 */
async function compileWithCodeSplitting(
  entryPoints: string[],
  outDir: string,
  fileMap: Map<string, string>,
  cwd: string,
  importMap: Record<string, string>,
  target: "server" | "client",
): Promise<{ compiled: number; chunks: number }> {
  if (entryPoints.length === 0) {
    return { compiled: 0, chunks: 0 };
  }

  // 根据 target 处理入口文件
  // - server: 使用原始文件（保留 load 函数）
  // - client: 通过 esbuild 插件拦截文件加载，移除 load 函数后返回代码内容
  // 使用原始文件路径作为入口点，通过插件处理代码内容
  const finalEntryPoints = entryPoints;

  // 为 client 版本创建插件，拦截文件加载并移除 load 函数
  const loadInterceptorPlugin: esbuild.Plugin | null = target === "client"
    ? {
      name: "remove-load-for-client",
      setup(build: esbuild.PluginBuild) {
        // 缓存处理后的代码内容
        const processedCodeCache = new Map<string, string>();

        // 拦截所有入口文件的加载
        build.onLoad(
          { filter: /.*/, namespace: "file" },
          async (args: esbuild.OnLoadArgs) => {
            // 只处理入口文件
            if (!entryPoints.includes(args.path)) {
              return undefined; // 使用默认加载
            }

            // 检查缓存
            if (processedCodeCache.has(args.path)) {
              const cachedCode = processedCodeCache.get(args.path)!;
              const ext = path.extname(args.path);
              const loader = ext === ".tsx"
                ? "tsx"
                : ext === ".ts"
                ? "ts"
                : "js";
              return {
                contents: cachedCode,
                loader,
              };
            }

            // 读取原始文件内容
            const sourceCode = await Deno.readTextFile(args.path);
            // 移除 load 函数
            const clientSourceCode = removeLoadOnlyImports(sourceCode);

            // 缓存处理后的代码
            processedCodeCache.set(args.path, clientSourceCode);

            // 确定 loader
            const ext = path.extname(args.path);
            const loader = ext === ".tsx" ? "tsx" : ext === ".ts" ? "ts" : "js";

            return {
              contents: clientSourceCode,
              loader,
            };
          },
        );
      },
    }
    : null;

  // 使用统一的构建函数，启用代码分割
  // 对于 client 版本，通过插件拦截文件加载；对于 server 版本，直接使用原始文件
  // 注意：loadInterceptorPlugin 需要在其他插件之前执行，所以使用 prePlugins
  const result = await buildFromEntryPoints(finalEntryPoints, {
    importMap,
    cwd,
    bundleClient: true,
    minify: true,
    legalComments: "none",
    splitting: true,
    outdir: outDir,
    outbase: cwd,
    prePlugins: loadInterceptorPlugin ? [loadInterceptorPlugin] : [],
  });

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error("esbuild 代码分割结果为空");
  }

  // 处理输出文件
  let compiled = 0;
  const chunkMap = new Map<string, string>(); // 原始路径 -> 输出文件名（入口文件是 hash.js，chunk 文件是 esbuild 文件名）
  const chunkFileMap = new Map<string, string>(); // esbuild chunk 路径 -> 输出文件名（用于替换代码中的引用）
  let fileInfoMap = new Map<
    string,
    { hash: string; hashName: string; content: string; relativePath: string }
  >(); // 文件信息映射

  // 根据 target 确定前缀（server/ 或 client/）
  const prefix = `${target}/`;

  // 第一遍循环：写入所有文件，记录映射关系
  // 创建一个映射：esbuild 原始路径 -> 输出文件名（用于替换所有相对路径引用）
  const esbuildPathToHashMap = new Map<string, string>();
  // 创建一个映射：内容 hash -> 输出文件名（仅用于入口文件，用于缓存等）
  const contentHashToFileNameMap = new Map<string, string>();

  for (const outputFile of result.outputFiles) {
    const outputPath = outputFile.path;
    const content = outputFile.text;

    // 计算输出路径相对于 outdir 的路径（esbuild 保持的目录结构）
    // outputPath 是 esbuild 的绝对输出路径，例如：/project/.dist/server/routes/index.js
    // outdir 是输出目录，例如：/project/.dist/server
    // 所以 relativeToOutdir 应该是 routes/index.js
    const relativeToOutdir = path.relative(outDir, outputPath);
    const relativeToOutdirNormalized = relativeToOutdir.replace(/[\/\\]/g, "/");

    // 提取 esbuild 生成的文件名（例如：chunk-RF5DZGEJ.js）
    const esbuildFileName = path.basename(relativeToOutdirNormalized);

    // 判断是否是入口文件，并记录匹配的入口文件路径
    let isEntryFile = false;
    let matchedEntryPoint: string | null = null;
    for (const originalEntryPoint of entryPoints) {
      // 计算入口文件相对于 cwd 的路径（去掉扩展名）
      const entryRelative = path.relative(cwd, originalEntryPoint);
      const entryPathWithoutExt = entryRelative.replace(/\.(tsx?|jsx?)$/, "");
      const entryPathNormalized = entryPathWithoutExt.replace(/[\/\\]/g, "/");

      // 检查输出路径是否匹配入口文件路径
      // esbuild 代码分割时，输出路径相对于 outdir 应该等于入口文件路径（相对于 cwd）+ .js
      // 例如：routes/index.js 应该匹配 routes/index
      // 或者：routes/index 应该匹配 routes/index（无扩展名的情况）
      // 或者：routes/index/chunk.js 应该匹配 routes/index（共享 chunk）
      if (
        relativeToOutdirNormalized === entryPathNormalized + ".js" ||
        relativeToOutdirNormalized.startsWith(entryPathNormalized + ".") ||
        relativeToOutdirNormalized === entryPathNormalized ||
        relativeToOutdirNormalized.startsWith(entryPathNormalized + "/")
      ) {
        isEntryFile = true;
        matchedEntryPoint = originalEntryPoint;
        break;
      }
    }

    // 根据文件类型生成不同的文件名格式
    // - 入口文件：使用内容 hash 命名（hash.js）
    // - chunk 文件：直接使用 esbuild 生成的文件名（如 chunk-RF5DZGEJ.js）
    // 注意：esbuild 在代码分割时生成的 chunk 文件名已经包含了标识符，我们可以直接使用
    // 这样可以避免因为内容修改导致 hash 改变而找不到文件的问题
    let hashName: string;
    if (isEntryFile) {
      // 入口文件：计算内容 hash
      const hash = await calculateHash(content);
      hashName = `${hash}.js`;
    } else {
      // chunk 文件：直接使用 esbuild 生成的文件名（已经是 chunk-XXXXX.js 格式）
      hashName = esbuildFileName;
    }
    const finalOutputPath = path.join(outDir, hashName);

    // 记录 esbuild 路径到输出文件名的映射（用于替换所有相对路径引用）
    esbuildPathToHashMap.set(relativeToOutdirNormalized, hashName);

    // 对于入口文件，记录内容 hash 到 hash 文件名的映射（用于缓存等）
    // 对于 chunk 文件，不需要记录 hash，因为直接使用 esbuild 的文件名
    if (isEntryFile) {
      const fileHash = await calculateHash(content);
      contentHashToFileNameMap.set(fileHash, hashName);
    }

    // 保存文件信息
    const fileHash = isEntryFile ? await calculateHash(content) : ""; // chunk 文件不需要 hash
    fileInfoMap.set(relativeToOutdirNormalized, {
      hash: fileHash,
      hashName,
      content,
      relativePath: relativeToOutdirNormalized,
    });

    if (isEntryFile && matchedEntryPoint) {
      // 根据 target 添加前缀（server/ 或 client/）
      const hashNameWithPrefix = `${prefix}${hashName}`;
      // 注意：代码分割时，server 和 client 使用同一个 fileMap，会互相覆盖
      // 为了避免覆盖，我们需要为 client 版本使用不同的 key（添加 .client 后缀）
      // 这样 server 和 client 版本的映射可以共存
      if (target === "client") {
        fileMap.set(`${matchedEntryPoint}.client`, hashNameWithPrefix);
      } else {
        fileMap.set(matchedEntryPoint, hashNameWithPrefix);
      }
      chunkMap.set(matchedEntryPoint, hashNameWithPrefix);
      compiled++;
    } else {
      // 如果不是入口文件，可能是共享 chunk 文件
      // 需要记录 chunk 文件的映射关系，用于替换代码中的引用
      // relativeToOutdirNormalized 是 esbuild 生成的 chunk 路径（相对于 outdir）
      // 例如：chunk-BNMXUETK.js 或 routes/chunk-BNMXUETK.js
      // hashName 是 esbuild 生成的文件名（如 chunk-BNMXUETK.js）
      chunkFileMap.set(relativeToOutdirNormalized, hashName);
    }

    // 写入文件（所有文件都需要写入，包括入口文件和共享 chunk）
    await Deno.writeTextFile(finalOutputPath, content);
  }

  // 第二遍循环：替换所有文件中的 chunk 引用
  // 需要多遍处理，因为 chunk 文件可能也引用了其他 chunk 文件
  let hasChanges = true;
  let iteration = 0;
  const maxIterations = 10; // 防止无限循环

  // 创建一个可变的 contentHashToFileNameMap 副本，用于在迭代中更新
  // 注意：这里必须使用深拷贝，因为 Map 的浅拷贝可能不会正确复制所有条目
  const currentContentHashToFileNameMap = new Map<string, string>();
  for (const [hash, fileName] of contentHashToFileNameMap.entries()) {
    currentContentHashToFileNameMap.set(hash, fileName);
  }

  while (hasChanges && iteration < maxIterations) {
    hasChanges = false;
    iteration++;

    // 创建新的文件信息映射，用于存储修改后的文件
    const newFileInfoMap = new Map<
      string,
      { hash: string; hashName: string; content: string; relativePath: string }
    >();

    for (const [relativePath, fileInfo] of fileInfoMap.entries()) {
      let modifiedContent = fileInfo.content;
      let modified = false;

      // 替换所有相对路径的 .js 文件引用
      // esbuild 代码分割时，会生成相对路径引用，如：
      // - from "../../../chunk-XXXXX.js" (esbuild 原始文件名)
      // - from "../chunk-XXXXX.js" (esbuild 原始文件名)
      // - from "./chunk-XXXXX.js" (esbuild 原始文件名)
      // 我们需要将所有相对路径的 .js 引用替换为对应的文件名
      // 注意：esbuild 生成的引用路径是相对于当前文件的，我们需要匹配这些路径
      for (const [esbuildPath, hashName] of esbuildPathToHashMap.entries()) {
        // 提取文件名（去掉路径，只保留文件名）
        const fileName = path.basename(esbuildPath);

        // 替换代码中的相对路径引用（匹配 esbuild 原始文件名）
        // 匹配各种格式：
        // - from "../../../chunk-XXXXX.js" (相对路径)
        // - from "../chunk-XXXXX.js" (相对路径)
        // - from "./chunk-XXXXX.js" (相对路径)
        // 使用大小写不敏感匹配，支持 chunk-XXXXX.js 和 chunk-xxxxx.js（小写）
        // 匹配任意数量的 ../ 或 ./
        // 注意：只匹配相对路径，不匹配绝对路径或外部依赖
        const pathRegex = new RegExp(
          `(["'])(\\.\\.?/)+${
            fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          }(["'])`,
          "gi", // 使用 i 标志进行大小写不敏感匹配
        );
        const newPath = `./${hashName}`;
        const newContent = modifiedContent.replace(
          pathRegex,
          (_match, quote1, _prefix, quote2) => {
            modified = true;
            return `${quote1}${newPath}${quote2}`;
          },
        );
        modifiedContent = newContent;

        // 同时，也要匹配可能的 hash 文件名（入口文件的 hash 文件名）
        // 注意：这里我们只匹配纯 hash 文件名（15 位十六进制，因为 calculateHash 返回 15 个字符），不匹配 chunk- 前缀的
        // 因为 chunk- 前缀的是 esbuild 生成的文件名格式
        if (/^[a-f0-9]{15}\.js$/i.test(fileName)) {
          // 这是一个 hash 文件名，可能是入口文件的 hash 文件名
          // 我们需要检查这个 hash 是否对应某个文件的内容
          const hashFromFileName = fileName.replace(/\.js$/, "");
          // 检查这个 hash 是否在我们的映射中（通过内容 hash 匹配）
          for (const [, info] of fileInfoMap.entries()) {
            if (info.hash === hashFromFileName) {
              // 找到了对应的文件，替换引用
              const hashFileNameRegex = new RegExp(
                `(["'])(\\.\\.?/)+${
                  fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                }(["'])`,
                "gi",
              );
              modifiedContent = modifiedContent.replace(
                hashFileNameRegex,
                (_match, quote1, _prefix, quote2) => {
                  modified = true;
                  return `${quote1}./${hashName}${quote2}`;
                },
              );
              break;
            }
          }
        }
      }

      // 同时，也要替换已经被替换为文件名的引用（如入口文件的 hash 文件名）
      // 这些引用可能是之前迭代中生成的
      // 匹配所有相对路径的文件名引用（15 位十六进制字符，因为 calculateHash 返回 15 个字符）
      // 注意：这里我们需要通过原始 esbuild 文件名来匹配，而不是依赖 hash，因为 hash 可能在迭代中改变
      const hashFileNameRegex =
        /(["'])(\.\.?\/)+(chunk-)?([a-f0-9]{15}\.js)(["'])/gi;
      modifiedContent = modifiedContent.replace(
        hashFileNameRegex,
        (match, quote1, _prefix, chunkPrefix, hashFileName, quote2) => {
          // 构建完整的文件名（包括可能的 chunk- 前缀）
          const fullFileName = chunkPrefix
            ? `chunk-${hashFileName}`
            : hashFileName;

          // 提取 hash 值（去掉 .js 扩展名）
          const hashFromFileName = hashFileName.replace(/\.js$/, "");

          // 首先，查找这个文件名对应的原始 esbuild 路径
          // 注意：这里我们需要通过 fileInfoMap 来查找，因为 hash 可能在迭代中改变
          for (const [, hashName] of esbuildPathToHashMap.entries()) {
            if (hashName === fullFileName) {
              // 如果找到了对应的映射，保持使用当前的文件名（因为可能已经被更新）
              modified = true;
              return `${quote1}./${hashName}${quote2}`;
            }
          }
          // 如果没有找到对应的映射，说明这个文件可能还没有被写入
          // 检查一下这个文件名是否在 fileInfoMap 中（可能是之前的迭代中生成的）
          for (const [, info] of fileInfoMap.entries()) {
            if (info.hashName === fullFileName) {
              modified = true;
              return `${quote1}./${info.hashName}${quote2}`;
            }
          }
          // 如果仍然没有找到，尝试通过内容 hash 匹配（可能是入口文件的 hash 文件名）
          // 注意：这里我们需要检查 fileInfoMap 中是否有匹配的 hash，因为 hash 可能在迭代中改变
          // 但是，如果 hash 改变了，那么 fileInfoMap 中的 hash 也会改变，所以我们需要检查所有可能的 hash
          // 实际上，我们应该通过 esbuild 原始文件名来匹配，而不是依赖 hash
          // 但是，esbuild 生成的代码中可能直接引用了 hash 文件名，所以我们需要通过 hash 来匹配
          // 解决方案：在 fileInfoMap 中查找所有可能的 hash，然后匹配对应的文件名
          for (const [, info] of fileInfoMap.entries()) {
            // 检查这个 hash 是否匹配任何文件的内容 hash（可能是之前的迭代中生成的）
            // 注意：这里我们检查的是 fileInfoMap 中的 hash，而不是 currentContentHashToFileNameMap
            // 因为 currentContentHashToFileNameMap 可能在迭代中被更新，导致旧的 hash 被删除
            if (info.hash === hashFromFileName) {
              // 找到了对应的文件（通过内容 hash 匹配），替换为正确的文件名
              modified = true;
              return `${quote1}./${info.hashName}${quote2}`;
            }
          }
          // 如果仍然没有找到，说明这个文件确实不存在，这不应该发生
          // 为了安全起见，我们保持原样，不输出警告（因为可能是正常的迭代过程）
          return match;
        },
      );

      // 如果内容被修改，需要重新计算 hash 并写入文件
      if (modified) {
        hasChanges = true;
        // 判断是否是入口文件，决定文件名格式
        let isEntryFile = false;
        for (const originalEntryPoint of entryPoints) {
          const entryRelative = path.relative(cwd, originalEntryPoint);
          const entryPathWithoutExt = entryRelative.replace(
            /\.(tsx?|jsx?)$/,
            "",
          );
          const entryPathNormalized = entryPathWithoutExt.replace(
            /[\/\\]/g,
            "/",
          );
          if (
            relativePath === entryPathNormalized + ".js" ||
            relativePath.startsWith(entryPathNormalized + ".") ||
            relativePath === entryPathNormalized ||
            relativePath.startsWith(entryPathNormalized + "/")
          ) {
            isEntryFile = true;
            break;
          }
        }
        // 根据文件类型生成不同的文件名格式
        // - 入口文件：使用内容 hash 命名（hash.js），内容改变时重新计算 hash
        // - chunk 文件：保持使用 esbuild 的原始文件名（如 chunk-BNMXUETK.js），不因内容修改而改变
        let newHashName: string;
        if (isEntryFile) {
          const newHash = await calculateHash(modifiedContent);
          newHashName = `${newHash}.js`;
        } else {
          // chunk 文件：保持使用原来的文件名（esbuild 的原始文件名）
          newHashName = fileInfo.hashName;
        }
        const newFinalOutputPath = path.join(outDir, newHashName);

        // 写入新文件
        await Deno.writeTextFile(newFinalOutputPath, modifiedContent);

        // 更新 chunk 文件映射（如果这个文件是 chunk 文件）
        if (chunkFileMap.has(relativePath)) {
          chunkFileMap.set(relativePath, newHashName);
        }

        // 更新 esbuildPathToHashMap（如果这个文件的 hash 改变了）
        if (esbuildPathToHashMap.has(relativePath)) {
          esbuildPathToHashMap.set(relativePath, newHashName);
        }
        // 更新 currentContentHashToFileNameMap（如果这个文件的 hash 改变了）
        // 注意：只有当 hash 真正改变时才需要更新映射（仅针对入口文件）
        if (isEntryFile && fileInfo.hash) {
          const newHash = await calculateHash(modifiedContent);
          if (fileInfo.hash !== newHash) {
            if (currentContentHashToFileNameMap.has(fileInfo.hash)) {
              currentContentHashToFileNameMap.delete(fileInfo.hash);
            }
            currentContentHashToFileNameMap.set(newHash, newHashName);
          }
        }

        // 更新文件信息映射
        const updatedHash = isEntryFile
          ? await calculateHash(modifiedContent)
          : ""; // chunk 文件不需要 hash
        newFileInfoMap.set(relativePath, {
          hash: updatedHash,
          hashName: newHashName,
          content: modifiedContent,
          relativePath: relativePath,
        });

        // 更新文件映射（如果是入口文件）
        for (const originalEntryPoint of entryPoints) {
          const entryRelative = path.relative(cwd, originalEntryPoint);
          const entryPathWithoutExt = entryRelative.replace(
            /\.(tsx?|jsx?)$/,
            "",
          );
          const entryPathNormalized = entryPathWithoutExt.replace(
            /[\/\\]/g,
            "/",
          );

          if (
            relativePath === entryPathNormalized + ".js" ||
            relativePath.startsWith(entryPathNormalized + ".") ||
            relativePath === entryPathNormalized ||
            relativePath.startsWith(entryPathNormalized + "/")
          ) {
            const hashNameWithPrefix = `${prefix}${newHashName}`;
            if (target === "client") {
              fileMap.set(`${originalEntryPoint}.client`, hashNameWithPrefix);
            } else {
              fileMap.set(originalEntryPoint, hashNameWithPrefix);
            }
            chunkMap.set(originalEntryPoint, hashNameWithPrefix);
            break;
          }
        }

        // 更新 esbuildPathToHashMap（如果这个文件的 hash 改变了）
        if (esbuildPathToHashMap.has(relativePath)) {
          esbuildPathToHashMap.set(relativePath, newHashName);
        }

        // 删除旧文件（如果 hash 改变了）
        if (fileInfo.hashName !== newHashName) {
          const oldFinalOutputPath = path.join(outDir, fileInfo.hashName);
          try {
            await Deno.remove(oldFinalOutputPath);
          } catch {
            // 忽略删除错误（文件可能不存在）
          }
        }
      } else {
        // 如果内容没有被修改，保持原样
        newFileInfoMap.set(relativePath, fileInfo);
      }
    }

    // 更新文件信息映射
    fileInfoMap = newFileInfoMap;
  }

  return { compiled, chunks: result.outputFiles.length };
}

/**
 * 编译目录中的所有文件（扁平化输出，使用 hash 文件名）
 * 注意：入口文件使用 hash 文件名，chunk 文件使用 esbuild 生成的文件名
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

  // 如果启用代码分割，使用批量编译
  if (codeSplitting && files.length > 1) {
    // 读取 deno.json 或 deno.jsonc 获取 import map
    const cwd = Deno.cwd();
    let importMap: Record<string, string> = {};
    try {
      const { readDenoJson } = await import("../utils/file.ts");
      const denoJson = await readDenoJson(cwd);
      if (denoJson && denoJson.imports) {
        importMap = denoJson.imports;
      }
    } catch {
      // deno.json 或 deno.jsonc 不存在或解析失败，使用空 import map
    }

    // 使用代码分割编译所有文件
    // 注意：代码分割时，target 不能是 'both'，必须是 'server' 或 'client'
    if (target === "both") {
      throw new Error(
        "代码分割不支持 target='both'，请分别编译 server 和 client 版本",
      );
    }
    console.log(
      `🔀 启用代码分割，批量编译 ${files.length} 个文件 (${target})...`,
    );
    const result = await compileWithCodeSplitting(
      files,
      absoluteOutDir,
      fileMap,
      cwd,
      importMap,
      target,
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
  }
}

/**
 * 后处理：替换所有编译文件中的相对路径导入为编译后的文件名
 * @param outDir 输出目录
 * @param fileMap 文件映射表（原始路径 -> 输出文件名）
 */
async function postProcessImports(
  outDir: string,
  fileMap: Map<string, string>,
): Promise<void> {
  console.log("\n🔄 后处理：替换导入路径...");

  // 创建反向映射：原始路径 -> 输出文件名
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

          // 查找对应的输出文件名
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
    `   ✅ 导入路径替换完成: 处理 ${processedCount} 个文件，修改 ${modifiedCount} 个文件`,
  );
}

/**
 * 生成路由映射文件（路由路径 -> 输出文件名）
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
    `   ✅ 路由映射文件生成完成: server.json (${
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

  const isMultApp = await isMultiAppMode();

	let outDir: string = config.build.outDir;
	
	console.log({ outDir, isMultApp, appName: config.name });

  let staticDir;
  if (isMultApp) {
    outDir = outDir + "/" + config.name;
    staticDir = config.static?.dir || config.name + "/assets";
  } else {
    staticDir = config.static?.dir || "assets";
  }

  console.log(`\n📦 构建输出目录: ${outDir}`);

  // 0. 检查是否需要清空输出目录
  // 如果启用缓存，不清空目录（保留已编译的文件）
  const useCache = config.build?.cache !== false; // 默认启用缓存
  if (!useCache) {
    await clearDirectory(outDir);
  } else {
    // 只确保输出目录存在
    await ensureDir(outDir);
    console.log(`   💾 启用构建缓存（增量构建）`);
  }

  // 文件映射表（原始路径 -> 输出文件名）
  const fileMap = new Map<string, string>();

  // 1. 复制静态资源（保持原文件名，不 hash 化）
  // 先复制所有文件（包括 CSS），Tailwind 插件构建时会覆盖 tailwind.css

  // 在多应用模式下，static.dir 已经包含了 path（在 config.ts 中已处理）
  // 输出目录直接使用 staticDir（已经包含 path）
  const staticOutDir = path.join(config.build.outDir, staticDir);
  const compressAssets = config.build?.compress === true;
  const imageQuality = config.build?.imageQuality || 80;

  console.log({ staticDir, staticOutDir, outDir });

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
        `   ✅ 静态资源处理完成 (${staticDir}): ${compressedCount} 个已压缩, ${copiedCount} 个已复制`,
      );
    } else {
      console.log(
        `   ✅ 复制静态资源完成 (${staticDir}): ${copiedCount} 个文件`,
      );
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
    console.log(
      `   ✅ 编译路由文件完成 (${routesDir}) - server 和 client 版本`,
    );
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
        console.log(
          `   ✅ 编译 API 文件完成 (${apiDir}) - server 和 client 版本`,
        );
      }
    } catch (error) {
      console.warn(`⚠️  API 目录编译失败: ${apiDir}`, error);
    }
  }

  // 4. 配置文件不再复制到构建输出目录
  // 注意：以下文件不再复制：
  // - tailwind.config.ts (由 Tailwind 插件处理)
  // - deno.json (运行时从项目根目录读取)
  // - deno.lock (运行时从项目根目录读取)
  // - dweb.config.ts (运行时从项目根目录加载)

  console.log("   ✅ 跳过配置文件复制（运行时从项目根目录读取）");

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
    outDir: config.build.outDir,
    staticDir: staticDir,
    isProduction: true,
  });

  // 7. 后处理：替换所有编译文件中的相对路径导入为编译后的文件名
  await postProcessImports(outDir, fileMap);

  // 8. 生成路由映射文件
  await generateRouteMap(fileMap, routesDir, outDir, routeConfig.apiDir);

  // 9. 不再生成服务器入口文件和构建信息
  // 注意：server.js 和 .build-info.json 不再生成，运行时使用 CLI 命令启动
  console.log(`\n📊 构建统计:`);
  console.log(`   • 输出目录: ${outDir}`);
  console.log(`   • 文件总数: ${fileMap.size} 个`);
  console.log(`   • 启动命令: deno task start`);
}

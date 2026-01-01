import { HashCalculator } from "./hash-calculator.ts";
import { CacheManager } from "./cache-manager.ts";
import { PathUtils } from "./utils.ts";
import * as path from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";
import { FileMapUtils } from "./utils.ts";
import { FileNameUtils } from "./utils.ts";
import { ImportMapUtils } from "./utils.ts";
import { LoaderUtils } from "./utils.ts";
import { buildFromEntryPoints } from "../utils/esbuild.ts";
import { buildFromStdin } from "../utils/esbuild.ts";
import { removeLoadOnlyImports } from "../utils/module.ts";
import { IS_SERVER } from "../../common/constants.ts";
import { logger } from "../utils/logger.ts";
import * as esbuild from "esbuild";
import { walk } from "@std/fs/walk";

/**
 * 文件编译器
 * 负责文件的编译、代码分割等功能
 */
export class FileCompiler {
  private hashCalculator: HashCalculator;
  private cacheManager: CacheManager;

  /**
   * 构造函数
   *
   * @param hashCalculator - Hash 计算器实例
   * @param cacheManager - 缓存管理器实例
   */
  constructor(hashCalculator: HashCalculator, cacheManager: CacheManager) {
    this.hashCalculator = hashCalculator;
    this.cacheManager = cacheManager;
  }

  /**
   * 判断文件是否是入口文件
   * 通过比较相对路径来判断输出文件是否对应某个入口文件
   *
   * @param relativePath - 输出文件相对于 outdir 的路径（已标准化）
   * @param entryPoints - 入口文件列表（绝对路径）
   * @param cwd - 工作目录
   * @returns 如果是入口文件，返回匹配的入口文件路径；否则返回 null
   */
  private isEntryFile(
    relativePath: string,
    entryPoints: string[],
    cwd: string,
  ): string | null {
    for (const originalEntryPoint of entryPoints) {
      // 计算入口文件相对于 cwd 的路径（去掉扩展名）
      const entryRelative = path.relative(cwd, originalEntryPoint);
      const entryPathWithoutExt = entryRelative.replace(/\.(tsx?|jsx?)$/, "");
      const entryPathNormalized = PathUtils.normalizePath(entryPathWithoutExt);

      // 检查输出路径是否匹配入口文件路径
      // esbuild 代码分割时，输出路径相对于 outdir 应该等于入口文件路径（相对于 cwd）+ .js
      // 例如：routes/index.js 应该匹配 routes/index
      // 或者：routes/index 应该匹配 routes/index（无扩展名的情况）
      // 或者：routes/index/chunk.js 应该匹配 routes/index（共享 chunk）
      if (
        relativePath === entryPathNormalized + ".js" ||
        relativePath.startsWith(entryPathNormalized + ".") ||
        relativePath === entryPathNormalized ||
        relativePath.startsWith(entryPathNormalized + "/")
      ) {
        return originalEntryPoint;
      }
    }
    return null;
  }

  /**
   * 编译单个文件并生成 hash 文件名（扁平化输出）
   * 支持构建缓存，如果源文件未变化则跳过编译
   * 会生成两个版本：服务端版本（包含 load 函数）和客户端版本（移除 load 函数）
   *
   * @param filePath - 源文件路径（绝对路径）
   * @param outDir - 输出目录（绝对路径，扁平化输出）
   * @param fileMap - 文件映射表（原始路径 -> 输出文件名）
   * @param useCache - 是否使用缓存（默认 true）
   * @param target - 编译目标：'server' | 'client' | 'both'（默认 'both'）
   * @returns 编译后的文件路径和 hash 文件名
   */
  async compileFile(
    filePath: string,
    outDir: string,
    fileMap: Map<string, string>,
    useCache: boolean = true,
    target: "server" | "client" | "both" = "both",
  ): Promise<{ outputPath: string; hashName: string; cached: boolean }> {
    try {
      // 确保使用绝对路径
      const absoluteFilePath = PathUtils.toAbsolutePath(filePath);
      const absoluteOutDir = PathUtils.toAbsolutePath(outDir);

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
        const sourceHash = await this.cacheManager.getSourceHash(
          absoluteFilePath,
        );
        if (target === "server" || target === "both") {
          const cachedHashName = await this.cacheManager.checkBuildCache(
            absoluteFilePath,
            serverOutDir,
            sourceHash,
          );
          if (cachedHashName) {
            const cachedOutputPath = path.join(serverOutDir, cachedHashName);
            FileMapUtils.setFileMapping(
              fileMap,
              filePath,
              cachedHashName,
              "server",
            );
            // 如果 target 是 both，还需要检查 client 缓存
            if (target === "both") {
              const clientCachedHashName = await this.cacheManager
                .checkBuildCache(
                  absoluteFilePath,
                  clientOutDir,
                  sourceHash,
                );
              if (clientCachedHashName) {
                FileMapUtils.setFileMapping(
                  fileMap,
                  filePath,
                  clientCachedHashName,
                  "client",
                );
                return {
                  outputPath: cachedOutputPath,
                  hashName: FileNameUtils.addTargetPrefix(
                    cachedHashName,
                    "server",
                  ),
                  cached: true,
                };
              }
            } else {
              return {
                outputPath: cachedOutputPath,
                hashName: FileNameUtils.addTargetPrefix(
                  cachedHashName,
                  "server",
                ),
                cached: true,
              };
            }
          }
        }
        if (target === "client") {
          const cachedHashName = await this.cacheManager.checkBuildCache(
            absoluteFilePath,
            clientOutDir,
            sourceHash,
          );
          if (cachedHashName) {
            const cachedOutputPath = path.join(clientOutDir, cachedHashName);
            FileMapUtils.setFileMapping(
              fileMap,
              filePath,
              cachedHashName,
              "client",
            );
            return {
              outputPath: cachedOutputPath,
              hashName: FileNameUtils.addTargetPrefix(
                cachedHashName,
                "client",
              ),
              cached: true,
            };
          }
        }
      }

      // 如果是 TSX/TS 文件，使用 esbuild 打包（包含所有依赖）
      if (FileNameUtils.isTypeScriptFile(ext)) {
        // 读取源代码
        const sourceCode = await Deno.readTextFile(absoluteFilePath);

        // 使用 esbuild.build 进行打包（会将所有静态导入打包到一个文件）
        // 注意：只打包项目内的相对路径导入，不打包外部依赖（如 @dreamer/dweb）
        const cwd = Deno.cwd();

        // 读取 deno.json 或 deno.jsonc 获取 import map（用于解析外部依赖）
        const importMap = await ImportMapUtils.loadImportMap(cwd);

        // 生成服务端版本（包含 load 函数）
        let serverCompiledContent: string | null = null;
        if (target === "server" || target === "both") {
          // 使用原始源代码编译（包含 load 函数）
          // 服务端构建时，明确指定 isServerBuild: true，确保 preact 相关依赖保持原始导入
          const result = await buildFromEntryPoints([absoluteFilePath], {
            importMap,
            cwd,
            bundleClient: true,
            isServerBuild: true, // 明确指定为服务端构建
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
          const hash = await this.hashCalculator.calculateHash(serverCode);
          // 生成文件名（仅使用 hash）
          const hashName = FileNameUtils.generateHashFileName(hash);
          const serverOutputPath = path.join(serverOutDir, hashName);

          // 确保目录存在（虽然已经创建，但为了安全再次确保）
          await ensureDir(path.dirname(serverOutputPath));

          // 写入服务端版本（包含 load 函数）
          await Deno.writeTextFile(serverOutputPath, serverCompiledContent);

          // 记录映射关系
          FileMapUtils.setFileMapping(fileMap, filePath, hashName, "server");
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
          // 注意：这里 ext 只能是 ".tsx" 或 ".ts"，因为前面已经检查过了
          const loader = LoaderUtils.getTypeScriptLoader(ext as ".tsx" | ".ts");

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
          const clientHash = await this.hashCalculator.calculateHash(
            compiledCode,
          );
          const clientHashName = FileNameUtils.generateHashFileName(clientHash);
          const clientOutputPath = path.join(clientOutDir, clientHashName);

          // 确保目录存在（虽然已经创建，但为了安全再次确保）
          await ensureDir(path.dirname(clientOutputPath));

          // 写入客户端版本
          await Deno.writeTextFile(clientOutputPath, clientCompiledContent);

          // 记录映射关系（使用 .client 后缀区分）
          FileMapUtils.setFileMapping(
            fileMap,
            filePath,
            clientHashName,
            "client",
          );
        }

        // 返回服务端版本的信息（如果存在）
        if (target === "server" || target === "both") {
          const hash = await this.hashCalculator.calculateHash(
            serverCompiledContent!,
          );
          const hashName = FileNameUtils.generateHashFileName(hash);
          const outputPath = path.join(serverOutDir, hashName);
          return {
            outputPath,
            hashName: FileNameUtils.addTargetPrefix(hashName, "server"),
            cached: false,
          };
        } else {
          // 只有客户端版本
          const clientHash = await this.hashCalculator.calculateHash(
            clientCompiledContent!,
          );
          const clientHashName = FileNameUtils.generateHashFileName(clientHash);
          const outputPath = path.join(clientOutDir, clientHashName);
          return {
            outputPath,
            hashName: FileNameUtils.addTargetPrefix(clientHashName, "client"),
            cached: false,
          };
        }
      } else {
        // 非 TS/TSX 文件，直接读取并计算 hash
        const fileContent = await Deno.readFile(absoluteFilePath);
        const hash = await this.hashCalculator.calculateHash(fileContent);
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
   *
   * @param entryPoints - 入口文件列表（绝对路径）
   * @param outDir - 输出目录（绝对路径）
   * @param fileMap - 文件映射表
   * @param cwd - 工作目录
   * @param importMap - import map 配置
   * @param target - 编译目标：'server' | 'client'（代码分割时不能是 'both'）
   * @returns 编译结果统计
   */
  async compileWithCodeSplitting(
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
                const ext = path.extname(args.path) as ".tsx" | ".ts";
                // 注意：entryPoints 只包含 .tsx 或 .ts 文件，所以 ext 只能是这两种
                const loader = LoaderUtils.getTypeScriptLoader(ext);
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
              // 注意：entryPoints 只包含 .tsx 或 .ts 文件，所以 ext 只能是这两种
              const ext = path.extname(args.path) as ".tsx" | ".ts";
              const loader = LoaderUtils.getTypeScriptLoader(ext);

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
      isServerBuild: target === "server", // 服务端构建时明确指定
      minify: true,
      legalComments: "none",
      splitting: true,
      outdir: outDir,
      outbase: cwd,
      prePlugins: loadInterceptorPlugin
        ? [loadInterceptorPlugin]
        : [] as esbuild.Plugin[],
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
      const relativeToOutdirNormalized = PathUtils.normalizePath(
        relativeToOutdir,
      );

      // 提取 esbuild 生成的文件名（例如：chunk-RF5DZGEJ.js）
      const esbuildFileName = path.basename(relativeToOutdirNormalized);

      // 判断是否是入口文件，并记录匹配的入口文件路径
      const matchedEntryPoint = this.isEntryFile(
        relativeToOutdirNormalized,
        entryPoints,
        cwd,
      );
      const isEntryFile = matchedEntryPoint !== null;

      // 根据文件类型生成不同的文件名格式
      // - 入口文件：使用内容 hash 命名（hash.js）
      // - chunk 文件：直接使用 esbuild 生成的文件名（如 chunk-RF5DZGEJ.js）
      // 注意：esbuild 在代码分割时生成的 chunk 文件名已经包含了标识符，我们可以直接使用
      // 这样可以避免因为内容修改导致 hash 改变而找不到文件的问题
      let hashName: string;
      if (isEntryFile) {
        // 入口文件：计算内容 hash
        const hash = await this.hashCalculator.calculateHash(content);
        hashName = FileNameUtils.generateHashFileName(hash);
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
        const fileHash = await this.hashCalculator.calculateHash(content);
        contentHashToFileNameMap.set(fileHash, hashName);
      }

      // 保存文件信息
      const fileHash = isEntryFile
        ? await this.hashCalculator.calculateHash(content)
        : ""; // chunk 文件不需要 hash
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
        FileMapUtils.setFileMappingForSplitting(
          fileMap,
          matchedEntryPoint!,
          hashNameWithPrefix,
          target,
        );
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
        {
          hash: string;
          hashName: string;
          content: string;
          relativePath: string;
        }
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
            const newHash = await this.hashCalculator.calculateHash(
              modifiedContent,
            );
            newHashName = FileNameUtils.generateHashFileName(newHash);
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
            const newHash = await this.hashCalculator.calculateHash(
              modifiedContent,
            );
            if (fileInfo.hash !== newHash) {
              if (currentContentHashToFileNameMap.has(fileInfo.hash)) {
                currentContentHashToFileNameMap.delete(fileInfo.hash);
              }
              currentContentHashToFileNameMap.set(newHash, newHashName);
            }
          }

          // 更新文件信息映射
          const updatedHash = isEntryFile
            ? await this.hashCalculator.calculateHash(modifiedContent)
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
              FileMapUtils.setFileMappingForSplitting(
                fileMap,
                originalEntryPoint,
                hashNameWithPrefix,
                target,
              );
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
   *
   * @param srcDir - 源目录（相对路径）
   * @param outDir - 输出目录（相对路径，扁平化）
   * @param fileMap - 文件映射表
   * @param extensions - 要编译的文件扩展名
   * @param useCache - 是否使用缓存（默认 true）
   * @param parallel - 是否并行编译（默认 true，最多 20 个并发）
   * @param codeSplitting - 是否启用代码分割（默认 false）
   * @param _minChunkSize - 代码分割的最小 chunk 大小（字节，默认 20000，暂未使用，由 esbuild 自动处理）
   * @param target - 编译目标：'server' | 'client' | 'both'（默认 'both'）
   */
  async compileDirectory(
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
    const absoluteSrcDir = PathUtils.toAbsolutePath(srcDir);
    const absoluteOutDir = PathUtils.toAbsolutePath(outDir);

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
      const importMap = await ImportMapUtils.loadImportMap(cwd);

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
      const result = await this.compileWithCodeSplitting(
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
        if (IS_SERVER) {
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
            const result = await this.compileFile(
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
        const result = await this.compileFile(
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
}

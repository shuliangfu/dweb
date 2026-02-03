/**
 * 构建系统模块
 * 提供生产环境代码编译、打包和优化
 *
 * 采用面向对象设计，将功能模块化为不同的类：
 * - HashCalculator: Hash 计算
 * - CacheManager: 构建缓存管理
 * - AssetProcessor: 静态资源处理
 * - FileCompiler: 文件编译
 * - ImportPostProcessor: 导入路径后处理
 * - RouteMapGenerator: 路由映射生成
 * - BuildManager: 主构建管理器
 */

import type { AppConfig } from "../../common/types/index.ts";
import { normalizeRouteConfig } from "../../core/config.ts";
import { ensureDir } from "@std/fs/ensure-dir";
import { walk } from "@std/fs/walk";
import { PluginManager } from "../../core/plugin.ts";
import * as path from "@std/path";
import { isMultiAppMode } from "../../core/config.ts";
import { PathUtils } from "./utils.ts";
import { HashCalculator } from "./hash-calculator.ts";
import { CacheManager } from "./cache-manager.ts";
import { AssetProcessor } from "./assets-processor.ts";
import { FileCompiler } from "./file-compiler.ts";

/**
 * 创建 JSR URL 解析插件（用于打包 @dreamer/dweb/client）
 * @param importMap import map 配置
 * @param cwd 工作目录
 * @returns esbuild 插件
 */
// JSR 解析插件已移至 utils/esbuild.ts

/**
 * 导入路径后处理器
 * 负责替换编译文件中的相对路径导入为编译后的文件名
 */
class ImportPostProcessor {
  /**
   * 替换导入路径中的相对路径为编译后的文件名
   * 这是一个通用的替换逻辑，用于处理静态导入和动态导入
   *
   * @param match - 匹配到的完整字符串
   * @param importPath - 导入路径（相对路径）
   * @param originalPath - 原始文件路径
   * @param pathToHashMap - 路径到 hash 文件名的映射表
   * @param isClient - 是否是客户端文件
   * @param quoteChar - 引号字符（' 或 "）
   * @param importType - 导入类型（'from' 或 'import'）
   * @returns 替换后的导入语句
   */
  private replaceImportPath(
    match: string,
    importPath: string,
    originalPath: string,
    pathToHashMap: Map<string, string>,
    isClient: boolean,
    quoteChar: string,
    importType: "from" | "import",
  ): string {
    // 解析相对路径为绝对路径
    const originalDir = path.dirname(originalPath);
    const absoluteImportPath = path.resolve(originalDir, importPath);
    const relativeImportPath = path.relative(
      Deno.cwd(),
      absoluteImportPath,
    );

    // 标准化路径（统一使用正斜杠）
    const normalizedRelative = PathUtils.normalizePath(relativeImportPath);
    const normalizedAbsolute = PathUtils.normalizePath(absoluteImportPath);

    // 查找对应的输出文件名
    const hashFileName = pathToHashMap.get(normalizedRelative) ||
      pathToHashMap.get(relativeImportPath) ||
      pathToHashMap.get(normalizedAbsolute) ||
      pathToHashMap.get(absoluteImportPath);

    if (hashFileName) {
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

      if (importType === "from") {
        return `from ${quoteChar}${relativeModulePath}${quoteChar}`;
      } else {
        return `import(${quoteChar}${relativeModulePath}${quoteChar})`;
      }
    }

    // 如果找不到映射，保持原样（可能是外部依赖或未编译的文件）
    return match;
  }

  /**
   * 后处理：替换所有编译文件中的相对路径导入为编译后的文件名
   *
   * @param outDir - 输出目录
   * @param fileMap - 文件映射表（原始路径 -> 输出文件名）
   */
  async postProcessImports(
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
      pathToHashMap.set(PathUtils.normalizePath(relativePath), hashName);
      pathToHashMap.set(PathUtils.normalizePath(originalPath), hashName);
    }

    // 遍历所有编译后的 JS 文件（处理 server 和 client 两个目录）
    const absoluteOutDir = PathUtils.toAbsolutePath(outDir);
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
            const quote = match.includes("'") ? "'" : '"';
            const replaced = this.replaceImportPath(
              match,
              importPath,
              originalPath,
              pathToHashMap,
              isClient,
              quote,
              "from",
            );
            if (replaced !== match) {
              modified = true;
            }
            return replaced;
          },
        );

        // 替换 import('相对路径') 动态导入中的相对路径
        content = content.replace(
          /import\s*\(\s*['"](\.\.?\/[^'"]+\.(tsx?|jsx?))['"]\s*\)/g,
          (match, importPath) => {
            const quote = match.includes("'") ? "'" : '"';
            const replaced = this.replaceImportPath(
              match,
              importPath,
              originalPath,
              pathToHashMap,
              isClient,
              quote,
              "import",
            );
            if (replaced !== match) {
              modified = true;
            }
            return replaced;
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
}

/**
 * 路由映射生成器
 * 负责生成路由映射文件
 */
class RouteMapGenerator {
  /**
   * 将路由添加到对应的路由映射表中
   * 根据 hashName 判断是 server 还是 client，并查找对应的客户端版本
   *
   * @param hashName - 输出文件名（可能包含 server/ 或 client/ 前缀）
   * @param originalPath - 原始文件路径
   * @param finalRoutePath - 最终的路由路径
   * @param fileMap - 文件映射表
   * @param serverRouteMap - 服务端路由映射表
   * @param clientRouteMap - 客户端路由映射表
   */
  private addRouteToMap(
    hashName: string,
    originalPath: string,
    finalRoutePath: string,
    fileMap: Map<string, string>,
    serverRouteMap: Record<string, string>,
    clientRouteMap: Record<string, string>,
  ): void {
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

  /**
   * 生成路由映射文件（路由路径 -> 输出文件名）
   * 分别生成 server 和 client 两个路由映射文件
   *
   * @param fileMap - 文件映射表
   * @param routesDir - 路由目录
   * @param outDir - 输出目录
   * @param apiDir - API 目录（可选，默认为 routes/api）
   */
  async generateRouteMap(
    fileMap: Map<string, string>,
    routesDir: string,
    outDir: string,
    apiDir?: string,
  ): Promise<void> {
    const serverRouteMap: Record<string, string> = {};
    const clientRouteMap: Record<string, string> = {};

    // 标准化 API 目录路径
    const apiDirAbsolute = apiDir
      ? PathUtils.toAbsolutePath(apiDir)
      : path.resolve(Deno.cwd(), routesDir, "api");

    const routesDirAbsolute = PathUtils.toAbsolutePath(routesDir);
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

      const originalPathAbsolute = PathUtils.toAbsolutePath(originalPath);

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

        // 移除扩展名
        const pathWithoutExt = routeRelativePath.replace(/\.tsx?$/, "");

        // 检查是否是 index 文件
        const isIndexFile = pathWithoutExt === "index" ||
          pathWithoutExt.endsWith("/index");

        if (isIndexFile) {
          // 处理 index 文件：计算基础路径
          const basePath = pathWithoutExt.replace(/\/?index$/, "") || "/";
          // 确保路径以 / 开头（除非是根路径）
          const finalRoutePath = basePath === "/"
            ? "/"
            : (basePath.startsWith("/") ? basePath : "/" + basePath);

          // 根据 hashName 判断是 server 还是 client，并添加到路由映射
          // 注册基础路径（例如 /docs）
          this.addRouteToMap(
            hashName,
            originalPath,
            finalRoutePath,
            fileMap,
            serverRouteMap,
            clientRouteMap,
          );

          // 同时注册带 /index 的路径（例如 /docs/index），支持两种访问方式
          if (finalRoutePath !== "/") {
            const pathWithIndex = finalRoutePath + "/index";
            this.addRouteToMap(
              hashName,
              originalPath,
              pathWithIndex,
              fileMap,
              serverRouteMap,
              clientRouteMap,
            );
          } else {
            // 根路径的 index 文件，也注册 /index 路径
            this.addRouteToMap(
              hashName,
              originalPath,
              "/index",
              fileMap,
              serverRouteMap,
              clientRouteMap,
            );
          }
        } else {
          // 处理非 index 文件
          // 移除扩展名，转换为路由路径
          const routePath = pathWithoutExt
            .replace(/^_/, "/_")
            .replace(/\/$/, "");

          // 如果路由路径为空，设置为根路径
          const finalRoutePath = routePath || "/";

          // 根据 hashName 判断是 server 还是 client，并添加到路由映射
          this.addRouteToMap(
            hashName,
            originalPath,
            finalRoutePath,
            fileMap,
            serverRouteMap,
            clientRouteMap,
          );
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

        // 根据 hashName 判断是 server 还是 client，并添加到路由映射
        this.addRouteToMap(
          hashName,
          originalPath,
          finalRoutePath,
          fileMap,
          serverRouteMap,
          clientRouteMap,
        );
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
}

/**
 * 构建管理器
 * 协调所有构建组件，执行完整的构建流程
 */
class BuildManager {
  private hashCalculator: HashCalculator;
  private cacheManager: CacheManager;
  private assetProcessor: AssetProcessor;
  private fileCompiler: FileCompiler;
  private importPostProcessor: ImportPostProcessor;
  private routeMapGenerator: RouteMapGenerator;

  /**
   * 构造函数
   */
  constructor() {
    this.hashCalculator = new HashCalculator();
    this.cacheManager = new CacheManager(this.hashCalculator);
    this.assetProcessor = new AssetProcessor();
    this.fileCompiler = new FileCompiler(
      this.hashCalculator,
      this.cacheManager,
    );
    this.importPostProcessor = new ImportPostProcessor();
    this.routeMapGenerator = new RouteMapGenerator();
  }

  /**
   * 构建单应用
   *
   * @param config - 应用配置
   */
  async buildApp(config: AppConfig): Promise<void> {
    if (!config.build) {
      throw new Error("构建配置 (build) 是必需的");
    }

    const isMultApp = await isMultiAppMode();

    let outDir: string = config.build.outDir;

    let staticDir;
    if (isMultApp) {
      outDir = outDir + "/" + config.name;
      staticDir = config.static?.dir || config.name + "/assets";
      console.log(`\n💡 构建多应用: ${config.name}`);
    } else {
      staticDir = config.static?.dir || "assets";
      console.log(`\n💡 构建单应用: ${config.name}`);
    }

    console.log(`\n📦 构建输出目录: ${outDir}`);

    // 0. 检查是否需要清空输出目录
    // 如果启用缓存，不清空目录（保留已编译的文件）
    const useCache = config.build?.cache !== false; // 默认启用缓存
    if (!useCache) {
      await this.assetProcessor.clearDirectory(outDir);
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

    try {
      const stats = await this.assetProcessor.processStaticAssets(
        staticDir,
        staticOutDir,
        compressAssets,
        imageQuality,
      );

      if (compressAssets) {
        console.log(
          `   ✅ 静态资源处理完成 (${staticDir}): ${stats.compressed} 个已压缩, ${stats.copied} 个已复制`,
        );
      } else {
        console.log(
          `   ✅ 复制静态资源完成 (${staticDir}): ${stats.copied} 个文件`,
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
    const routesDirAbsolute = PathUtils.toAbsolutePath(routesDir);
    const apiDirAbsolute = PathUtils.toAbsolutePath(apiDir);

    // 判断 API 目录是否在 routes 目录下
    const apiDirInRoutes =
      apiDirAbsolute.startsWith(routesDirAbsolute + path.SEPARATOR) ||
      apiDirAbsolute === routesDirAbsolute;

    // 检查是否启用代码分割
    const codeSplitting = config.build?.split === true;
    const minChunkSize = config.build?.chunkSize || 20000;

    try {
      // 编译路由文件到 server 目录（包含 load 函数）
      await this.fileCompiler.compileDirectory(
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
      await this.fileCompiler.compileDirectory(
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
          await this.fileCompiler.compileDirectory(
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
          await this.fileCompiler.compileDirectory(
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

    // 4. 复制 locales 目录（i18n 翻译文件）
    // 检查是否有 i18n 插件配置，如果有则复制 locales 目录
    const hasI18nPlugin = config.plugins?.some((plugin: any) => {
      return plugin?.name === "i18n" || plugin?.config?.languages;
    });

    if (hasI18nPlugin) {
      // 尝试从插件配置中获取 translationsDir
      let translationsDir = "locales";
      const i18nPlugin = config.plugins?.find((plugin: any) => {
        return plugin?.name === "i18n" || plugin?.config?.languages;
      });
      if (i18nPlugin?.config?.translationsDir) {
        translationsDir = i18nPlugin.config.translationsDir;
      }

      // 检查 locales 目录是否存在
      const translationsDirAbsolute = PathUtils.toAbsolutePath(translationsDir);
      const translationsDirExists = await Deno.stat(translationsDirAbsolute)
        .then(() => true)
        .catch(() => false);

      if (translationsDirExists) {
        const translationsOutDir = path.join(outDir, translationsDir);
        try {
          // 复制 locales 目录到输出目录
          await ensureDir(translationsOutDir);
          let copiedCount = 0;

          for await (const entry of walk(translationsDirAbsolute)) {
            if (entry.isFile && entry.path.endsWith(".json")) {
              const relativePath = path.relative(
                translationsDirAbsolute,
                entry.path,
              );
              const outputPath = path.join(translationsOutDir, relativePath);
              const outputDir = path.dirname(outputPath);
              await ensureDir(outputDir);
              await Deno.copyFile(entry.path, outputPath);
              copiedCount++;
            }
          }

          if (copiedCount > 0) {
            console.log(
              `   ✅ 复制翻译文件完成 (${translationsDir}): ${copiedCount} 个文件`,
            );
          }
        } catch (error) {
          console.warn(`⚠️  复制翻译文件失败: ${translationsDir}`, error);
        }
      }
    }

    // 5. 配置文件不再复制到构建输出目录
    // 注意：以下文件不再复制：
    // - tailwind.config.ts (由 Tailwind 插件处理)
    // - deno.json (运行时从项目根目录读取)
    // - deno.lock (运行时从项目根目录读取)
    // - dweb.config.ts (运行时从项目根目录加载)

    console.log("   ✅ 跳过配置文件复制（运行时从项目根目录读取）");

    // 6. 不再复制 deno.json 到输出目录
    // 注意：运行时从项目根目录读取 deno.json，不需要复制到 dist 目录

    // 7. 创建插件管理器并执行构建钩子
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

    // 7.5. 编译入口文件 (main.ts 或 config.build.entry)
    let entryFile: string;
    if (config.build.entry) {
      entryFile = config.build.entry;
    } else {
      if (isMultApp) {
        entryFile = path.join(config.name || "", "main.ts");
      } else {
        entryFile = "main.ts";
      }
    }

    const entryFileAbsolute = PathUtils.toAbsolutePath(entryFile);
    const entryFileExists = await Deno.stat(entryFileAbsolute)
      .then((stat) => stat.isFile)
      .catch(() => false);

    if (entryFileExists) {
      try {
        console.log(`\n🚀 正在编译入口文件: ${entryFile}`);
        const { hashName } = await this.fileCompiler.compileFile(
          entryFile,
          serverOutDir,
          fileMap,
          useCache,
          "server",
        );
        console.log(`   ✅ 入口文件编译完成: ${hashName}`);

        // 记录入口文件到文件映射表（用于生成 manifest.json）
        // 这里的 key 使用 entryFile (如 "main.ts")
        fileMap.set(entryFile, hashName);
      } catch (error) {
        console.warn(`⚠️  入口文件编译失败: ${entryFile}`, error);
      }
    }

    // 8. 后处理：替换所有编译文件中的相对路径导入为编译后的文件名
    await this.importPostProcessor.postProcessImports(outDir, fileMap);

    // 9. 生成路由映射文件
    await this.routeMapGenerator.generateRouteMap(
      fileMap,
      routesDir,
      outDir,
      routeConfig.apiDir,
    );

    // 9.5 生成 manifest.json
    // 包含构建元数据和入口文件映射
    const manifest = {
      timestamp: Date.now(),
      entry: fileMap.get(entryFile),
      files: Object.fromEntries(fileMap.entries()),
    };
    await Deno.writeTextFile(
      path.join(outDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    console.log(`   ✅ 生成清单文件: manifest.json`);

    // 10. 不再生成服务器入口文件和构建信息
    // 注意：server.js 和 .build-info.json 不再生成，运行时使用 CLI 命令启动
    console.log(`\n📊 构建统计:`);
    console.log(`   • 输出目录: ${outDir}`);
    console.log(`   • 文件总数: ${fileMap.size} 个`);
    console.log(`   • 启动命令: deno task start`);
  }
}

/**
 * 构建项目
 * @param config 单应用配置对象（CLI 已处理多应用模式，传入的是单个应用的配置）
 */
export async function build(config: AppConfig): Promise<void> {
  const buildManager = new BuildManager();
  await buildManager.buildApp(config);
}

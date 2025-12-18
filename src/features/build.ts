/**
 * 构建系统模块
 * 提供生产环境代码编译、打包和优化
 */

import type { AppConfig } from '../types/index.ts';
import { normalizeRouteConfig } from '../core/config.ts';
import { ensureDir } from '@std/fs/ensure_dir';
import { walk } from '@std/fs/walk';
import { PluginManager } from '../core/plugin.ts';
import { crypto } from '@std/crypto';
import * as path from '@std/path';
import * as esbuild from 'esbuild';

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

      console.log(`🗑️  已清空目录: ${dirPath}`);
    } catch (_error) {
      // 如果 walk 失败（可能是目录结构有问题），尝试直接删除整个目录后重建
      try {
        await Deno.remove(dirPath, { recursive: true });
        await ensureDir(dirPath);
        console.log(`🗑️  已清空并重建目录: ${dirPath}`);
      } catch (removeError) {
        console.warn(`⚠️  清空目录失败: ${dirPath}`, removeError);
      }
    }
  } catch (error) {
    console.warn(`⚠️  清空目录失败: ${dirPath}`, error);
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

  if (typeof content === 'string') {
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

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // 返回前 10 个字符作为文件名 hash
  return hashHex.substring(0, 10);
}

/**
 * 生成扁平化的文件名（避免冲突）
 * 例如：routes/index.tsx -> routes_index.[hash].js
 *      components/Navbar.tsx -> components_Navbar.[hash].js
 * @param filePath 文件路径（绝对路径）
 * @param hash 文件 hash 值
 * @param baseDir 基础目录（用于计算相对路径）
 * @returns 扁平化文件名
 */
function generateFlatFileName(
  filePath: string,
  hash: string,
  baseDir: string = Deno.cwd()
): string {
  // 获取相对于基础目录的路径
  const relativePath = path.relative(baseDir, filePath);

  // 移除扩展名
  const pathWithoutExt = relativePath.replace(/\.(tsx?|jsx?)$/, '');

  // 将路径分隔符替换为下划线，避免文件名冲突
  // routes/index.tsx -> routes_index
  // components/Navbar.tsx -> components_Navbar
  // routes/api/users.ts -> routes_api_users
  const flatName = pathWithoutExt.replace(/[\/\\]/g, '_');

  // 处理特殊情况：如果文件名以 _ 开头（如 _layout.tsx），保留下划线
  // 生成最终文件名：routes_index.[hash].js
  return `${flatName}.${hash}.js`;
}

/**
 * 编译单个文件并生成 hash 文件名（扁平化输出）
 * @param filePath 源文件路径（绝对路径）
 * @param outDir 输出目录（绝对路径，扁平化输出）
 * @param fileMap 文件映射表（原始路径 -> hash 文件名）
 * @returns 编译后的文件路径和 hash 文件名
 */
async function compileFile(
  filePath: string,
  outDir: string,
  fileMap: Map<string, string>
): Promise<{ outputPath: string; hashName: string }> {
  try {
    // 确保使用绝对路径
    const absoluteFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(Deno.cwd(), filePath);
    const absoluteOutDir = path.isAbsolute(outDir) ? outDir : path.resolve(Deno.cwd(), outDir);

    // 确保输出目录存在
    await ensureDir(absoluteOutDir);

    const ext = path.extname(filePath);

    // 如果是 TSX/TS 文件，使用 esbuild 打包（包含所有依赖）
    if (ext === '.tsx' || ext === '.ts') {
      // 使用 esbuild.build 进行打包（会将所有静态导入打包到一个文件）
      // 注意：只打包项目内的相对路径导入，不打包外部依赖（如 @dreamer/dweb）
      const cwd = Deno.cwd();
      
      // 读取 deno.json 获取 import map（用于解析外部依赖）
      let importMap: Record<string, string> = {};
      try {
        const denoJsonPath = path.join(cwd, 'deno.json');
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
        '@dreamer/dweb',
        'preact',
        'preact-render-to-string',
      ];
      
      // 从 import map 中添加所有外部依赖
      for (const [key, value] of Object.entries(importMap)) {
        if (value.startsWith('jsr:') || value.startsWith('npm:') || value.startsWith('http')) {
          externalPackages.push(key);
        }
      }

      // 使用 esbuild.build 打包文件（包含所有静态导入）
      // bundle: true 会自动打包所有相对路径导入（../ 和 ./），
      // 只有 external 中列出的外部依赖不会被打包
      const result = await esbuild.build({
        entryPoints: [absoluteFilePath],
        bundle: true, // ✅ 打包所有依赖（包括相对路径导入 ../ 和 ./）
        format: 'esm',
        target: 'esnext',
        jsx: 'automatic',
        jsxImportSource: 'preact',
        minify: true, // ✅ 压缩代码
        // keepNames: true, // ✅ 保留导出名称（确保 load 方法名不被压缩）
        treeShaking: true, // ✅ Tree-shaking
        legalComments: 'none', // ✅ 移除注释
        write: false, // 不写入文件，我们手动处理
        external: externalPackages, // 外部依赖不打包（保持 import 语句）
        // 设置 import map（用于解析外部依赖）
        // 注意：相对路径导入（../ 和 ./）不会被 alias 处理，由 esbuild 自动解析和打包
        alias: Object.fromEntries(
          Object.entries(importMap).map(([key, value]) => [
            key,
            value.startsWith('jsr:') || value.startsWith('npm:') || value.startsWith('http')
              ? value
              : path.resolve(cwd, value),
          ])
        ),
      });

      if (!result.outputFiles || result.outputFiles.length === 0) {
        throw new Error(`esbuild 打包结果为空: ${filePath}`);
      }

      // esbuild.build 返回的是 outputFiles 数组，取第一个
      const compiledContent = result.outputFiles[0].text;

      // 计算 hash（用于缓存）
      const hash = await calculateHash(compiledContent);

      // 生成扁平化文件名（包含路径信息，避免冲突）
      const hashName = generateFlatFileName(absoluteFilePath, hash);
      const outputPath = path.join(absoluteOutDir, hashName);

      // 写入最终文件（暂时不替换导入，后续统一处理）
      await Deno.writeTextFile(outputPath, compiledContent);

      // 记录映射关系
      fileMap.set(filePath, hashName);

      return { outputPath, hashName };
    } else {
      // 非 TS/TSX 文件，直接读取并计算 hash
      const fileContent = await Deno.readFile(absoluteFilePath);
      const hash = await calculateHash(fileContent);
      const originalExt = ext || '';

      // 生成扁平化文件名
      const hashName = generateFlatFileName(absoluteFilePath, hash) + originalExt;
      const outputPath = path.join(absoluteOutDir, hashName);

      // 复制文件
      await Deno.writeFile(outputPath, fileContent);

      // 记录映射关系
      fileMap.set(filePath, hashName);

      return { outputPath, hashName };
    }
  } catch (error) {
    console.error(`编译文件失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 编译目录中的所有文件（扁平化输出，使用 hash 文件名）
 * @param srcDir 源目录（相对路径）
 * @param outDir 输出目录（相对路径，扁平化）
 * @param fileMap 文件映射表
 * @param extensions 要编译的文件扩展名
 */
async function compileDirectory(
  srcDir: string,
  outDir: string,
  fileMap: Map<string, string>,
  extensions: string[] = ['.ts', '.tsx']
): Promise<void> {
  // 转换为绝对路径
  const absoluteSrcDir = path.isAbsolute(srcDir) ? srcDir : path.resolve(Deno.cwd(), srcDir);
  const absoluteOutDir = path.isAbsolute(outDir) ? outDir : path.resolve(Deno.cwd(), outDir);

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

  console.log(`📝 找到 ${files.length} 个文件需要编译`);

  // 编译每个文件
  for (const file of files) {
    await compileFile(file, absoluteOutDir, fileMap);
  }

  console.log(`✅ 编译完成: ${files.length} 个文件`);
}

/**
 * 后处理：替换所有编译文件中的相对路径导入为编译后的文件名
 * @param outDir 输出目录
 * @param fileMap 文件映射表（原始路径 -> hash 文件名）
 */
async function postProcessImports(
  outDir: string,
  fileMap: Map<string, string>
): Promise<void> {
  console.log('🔄 后处理：替换导入路径...');
  
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
    pathToHashMap.set(relativePath.replace(/\\/g, '/'), hashName);
    pathToHashMap.set(originalPath.replace(/\\/g, '/'), hashName);
  }

  // 遍历所有编译后的 JS 文件
  const absoluteOutDir = path.isAbsolute(outDir) ? outDir : path.resolve(Deno.cwd(), outDir);
  let processedCount = 0;
  let modifiedCount = 0;
  
  for (const [originalPath, hashName] of fileMap.entries()) {
    // 只处理 TS/TSX 文件编译后的 JS 文件
    if (!originalPath.endsWith('.ts') && !originalPath.endsWith('.tsx')) {
      continue;
    }

    const outputPath = path.join(absoluteOutDir, hashName);
    
    try {
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
          const relativeImportPath = path.relative(Deno.cwd(), absoluteImportPath);
          
          // 标准化路径（统一使用正斜杠）
          const normalizedRelative = relativeImportPath.replace(/\\/g, '/');
          const normalizedAbsolute = absoluteImportPath.replace(/\\/g, '/');
          
          // 查找对应的 hash 文件名
          const hashFileName = pathToHashMap.get(normalizedRelative) || 
                               pathToHashMap.get(relativeImportPath) ||
                               pathToHashMap.get(normalizedAbsolute) ||
                               pathToHashMap.get(absoluteImportPath);
          
          if (hashFileName) {
            modified = true;
            // 替换为相对路径（相对于输出目录，使用 ./ 前缀）
            // 所有编译后的文件都在同一个 dist 目录下，使用相对路径即可
            const relativeModulePath = `./${hashFileName}`;
            const quote = match.includes("'") ? "'" : '"';
            return `from ${quote}${relativeModulePath}${quote}`;
          }
          
          // 如果找不到映射，保持原样（可能是外部依赖或未编译的文件）
          return match;
        }
      );

      // 替换 import('相对路径') 动态导入中的相对路径
      content = content.replace(
        /import\s*\(\s*['"](\.\.?\/[^'"]+\.(tsx?|jsx?))['"]\s*\)/g,
        (match, importPath) => {
          const originalDir = path.dirname(originalPath);
          const absoluteImportPath = path.resolve(originalDir, importPath);
          const relativeImportPath = path.relative(Deno.cwd(), absoluteImportPath);
          
          const normalizedRelative = relativeImportPath.replace(/\\/g, '/');
          const normalizedAbsolute = absoluteImportPath.replace(/\\/g, '/');
          
          const hashFileName = pathToHashMap.get(normalizedRelative) || 
                               pathToHashMap.get(relativeImportPath) ||
                               pathToHashMap.get(normalizedAbsolute) ||
                               pathToHashMap.get(absoluteImportPath);
          
          if (hashFileName) {
            modified = true;
            // 替换为相对路径（相对于输出目录，使用 ./ 前缀）
            const relativeModulePath = `./${hashFileName}`;
            const quote = match.includes("'") ? "'" : '"';
            return `import(${quote}${relativeModulePath}${quote})`;
          }
          
          return match;
        }
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

  console.log(`✅ 导入路径替换完成: 处理 ${processedCount} 个文件，修改 ${modifiedCount} 个文件`);
}

/**
 * 生成路由映射文件（路由路径 -> hash 文件名）
 * @param fileMap 文件映射表
 * @param routesDir 路由目录
 * @param outDir 输出目录
 */
async function generateRouteMap(
  fileMap: Map<string, string>,
  routesDir: string,
  outDir: string
): Promise<void> {
  const routeMap: Record<string, string> = {};

  // 遍历文件映射表，找出路由文件
  for (const [originalPath, hashName] of fileMap.entries()) {
    // 检查是否是路由文件
    if (originalPath.includes(routesDir)) {
      // 计算路由路径（从 routes 目录开始的相对路径）
      const routeRelativePath = path.relative(path.resolve(Deno.cwd(), routesDir), originalPath);

      // 移除扩展名，转换为路由路径
      const routePath = routeRelativePath
        .replace(/\.tsx?$/, '')
        .replace(/^api\//, '/api/')
        .replace(/^_/, '/_')
        .replace(/\/index$/, '/')
        .replace(/\/$/, '');

      // 如果路由路径为空，设置为根路径
      const finalRoutePath = routePath || '/';

      routeMap[finalRoutePath] = hashName;
    }
  }

  // 写入路由映射文件
  const routeMapPath = path.join(outDir, '.route-map.json');
  await Deno.writeTextFile(routeMapPath, JSON.stringify(routeMap, null, 2));

  console.log(`✅ 路由映射文件已生成: .route-map.json`);
}

/**
 * 生成服务器入口文件
 * @param outDir 输出目录
 * @param _config 配置对象（未使用，保留用于未来扩展）
 */
async function generateServerEntry(outDir: string, _config: AppConfig): Promise<void> {
  // 注意：此文件仅用于兼容性，实际启动请使用 cli start 命令
  const entryContent = `/**
 * 生产服务器入口文件
 * 此文件由构建系统自动生成，请勿手动修改
 * 
 * 运行方式（从项目根目录）：
 *   deno task start
 */

// 从 JSR 包导入框架（Deno 会在运行时通过 deno.json 的 import map 解析依赖）
import { startProdServer } from '@dreamer/dweb';
import { loadConfig } from '@dreamer/dweb';

// 从项目根目录加载配置文件（与 cli start 保持一致）
// 注意：需要从项目根目录运行，而不是从 dist 目录运行
const { config } = await loadConfig();

// 启动生产服务器
await startProdServer(config);
`;

  const entryPath = path.join(outDir, 'server.js');
  await Deno.writeTextFile(entryPath, entryContent);

  console.log(`✅ 服务器入口文件已生成: server.js`);
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
    throw new Error('构建配置 (build) 是必需的');
  }
  const outDir = config.build.outDir;

  console.log(`📦 构建到: ${outDir}`);

  // 0. 清空输出目录
  await clearDirectory(outDir);

  // 确保输出目录存在
  await ensureDir(outDir);

  // 文件映射表（原始路径 -> hash 文件名）
  const fileMap = new Map<string, string>();

  // 1. 复制静态资源（保持原文件名，不 hash 化）
  // CSS 文件会由 Tailwind 插件处理，这里只复制其他静态资源
  const staticDir = config.staticDir || 'public';
  const staticOutDir = path.join(outDir, staticDir);
  try {
    await ensureDir(staticOutDir);

    // 遍历静态资源目录
    for await (const entry of walk(staticDir)) {
      if (entry.isFile) {
        const ext = path.extname(entry.path);
        // CSS 文件跳过（由 Tailwind 插件处理）
        if (ext === '.css') {
          continue;
        }

        // 其他静态资源保持原文件名复制
        const relativePath = path.relative(staticDir, entry.path);
        const outputPath = path.join(staticOutDir, relativePath);
        const outputDir = path.dirname(outputPath);
        await ensureDir(outputDir);

        await Deno.copyFile(entry.path, outputPath);
      }
    }
    console.log(`✅ 复制静态资源完成 (${staticDir})`);
  } catch {
    // 静态资源目录不存在时忽略错误
  }

  // 2. 编译路由文件（扁平化输出到 outDir）
  if (!config.routes) {
    throw new Error('路由配置 (routes) 是必需的');
  }
  const routeConfig = normalizeRouteConfig(config.routes);
  const routesDir = routeConfig.dir || 'routes';
  try {
    await compileDirectory(routesDir, outDir, fileMap, ['.ts', '.tsx']);
    console.log(`✅ 编译路由文件完成 (${routesDir})`);
  } catch (error) {
    console.warn(`⚠️  路由目录编译失败: ${routesDir}`, error);
  }

  // 3. 编译组件文件（扁平化输出到 outDir）
  try {
    if (
      await Deno.stat('components')
        .then(() => true)
        .catch(() => false)
    ) {
      await compileDirectory('components', outDir, fileMap, ['.ts', '.tsx']);
      console.log('✅ 编译组件文件完成 (components)');
    }
  } catch (error) {
    console.warn('⚠️  组件目录编译失败', error);
  }

  // 4. 复制配置文件（不包括 dweb.config.ts，因为通过 cli start 启动时会从项目根目录加载）
  // 其他配置文件可以 hash 化
  const configFiles = ['tailwind.config.ts', 'deno.json', 'deno.lock'];
  for (const configFile of configFiles) {
    try {
      if (
        await Deno.stat(configFile)
          .then(() => true)
          .catch(() => false)
      ) {
        const fileContent = await Deno.readFile(configFile);
        const hash = await calculateHash(fileContent);
        const ext = path.extname(configFile);
        const hashName = `${hash}${ext}`;
        const outputPath = path.join(outDir, hashName);

        await Deno.writeFile(outputPath, fileContent);
        fileMap.set(configFile, hashName);
      }
    } catch {
      // 文件不存在时忽略
    }
  }

  console.log('✅ 处理配置文件完成');

  // 5. 复制项目的 deno.json 到输出目录（用于运行时解析 import map）
  // 注意：框架代码通过 JSR 包导入，不需要复制框架源代码
  console.log('📦 复制项目配置文件...');
  try {
    const denoJsonPath = path.join(Deno.cwd(), 'deno.json');
    if (
      await Deno.stat(denoJsonPath)
        .then(() => true)
        .catch(() => false)
    ) {
      const denoJsonContent = await Deno.readTextFile(denoJsonPath);
      const denoJson = JSON.parse(denoJsonContent);

      // 确保 @std/path/glob-to-regexp 映射正确（修复可能的错误映射）
      if (denoJson.imports) {
        // 移除错误的 @std/path/glob 映射（如果存在）
        if (denoJson.imports['@std/path/glob']) {
          delete denoJson.imports['@std/path/glob'];
        }
        // 确保 @std/path/glob-to-regexp 映射正确
        if (!denoJson.imports['@std/path/glob-to-regexp']) {
          denoJson.imports['@std/path/glob-to-regexp'] = 'jsr:@std/path@^1.1.3/glob-to-regexp';
        }
      }

      const denoJsonOutputPath = path.join(outDir, 'deno.json');
      await Deno.writeTextFile(denoJsonOutputPath, JSON.stringify(denoJson, null, 2));
      console.log('✅ 复制并修复 deno.json 到输出目录');
    }
  } catch (error) {
    console.warn(`⚠️  复制 deno.json 失败:`, error);
  }

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
  await generateRouteMap(fileMap, routesDir, outDir);

  // 9. 生成文件映射表（JSON 格式）
  const fileMapObj: Record<string, string> = {};
  for (const [originalPath, hashName] of fileMap.entries()) {
    // 使用相对路径作为 key
    const relativePath = path.relative(Deno.cwd(), originalPath);
    fileMapObj[relativePath] = hashName;
  }

  await Deno.writeTextFile(
    path.join(outDir, '.file-map.json'),
    JSON.stringify(fileMapObj, null, 2)
  );

  // 9. 生成服务器入口文件
  await generateServerEntry(outDir, config);

  // 10. 生成构建信息
  const buildInfo = {
    buildTime: new Date().toISOString(),
    outDir,
    routesDir,
    staticDir,
    fileCount: fileMap.size,
    entryFile: 'server.js',
    frameworkSourceDir: 'src',
  };

  await Deno.writeTextFile(
    path.join(outDir, '.build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );

  console.log('✅ 构建信息已生成');
  console.log(`📊 构建统计: 输出目录 ${outDir}, 共 ${fileMap.size} 个文件`);
  console.log(`🚀 启动命令: deno task start`);
}

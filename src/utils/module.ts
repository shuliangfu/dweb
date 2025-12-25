/**
 * 模块处理工具函数
 * 用于代码分析、函数提取、导入处理等
 */

import * as esbuild from "esbuild";

/**
 * 判断是否为服务端依赖
 * 服务端依赖应该保持 external，不被打包到客户端代码中
 * 
 * 判断规则（按优先级）：
 * 1. Deno 标准库和内置模块（@std/*、deno:）- 明确的服务端依赖
 * 2. 数据库驱动（@sqlite、@postgres、@mysql、@mongodb 等）- 明确的服务端依赖
 * 3. 服务端渲染库（preact-render-to-string）- 明确的服务端依赖
 * 4. 图片处理库（sharp）- 明确的服务端依赖
 * 5. 其他包名包含 server、backend、deno 等关键词的包
 * 
 * @param packageName 包名
 * @returns 是否为服务端依赖
 */
export function isServerDependency(packageName: string): boolean {
  // Deno 标准库（@std/*）
  if (packageName.startsWith("@std/")) {
    return true;
  }
  
  // Deno 内置模块（deno:）
  if (packageName.startsWith("deno:")) {
    return true;
  }
  
  // 数据库驱动（常见的数据库包）
  if (
    packageName.startsWith("@sqlite") ||
    packageName.startsWith("@postgres") ||
    packageName.startsWith("@mysql") ||
    packageName.startsWith("@mongodb") ||
    packageName.startsWith("sqlite") ||
    packageName.startsWith("postgres") ||
    packageName.startsWith("mysql") ||
    packageName.startsWith("mongodb")
  ) {
    return true;
  }
  
  // 服务端渲染库
  if (packageName === "preact-render-to-string" || packageName.startsWith("preact-render-to-string/")) {
    return true;
  }
  
  // 图片处理库（服务端）
  if (packageName === "sharp" || packageName.startsWith("sharp/")) {
    return true;
  }
  
  // 构建工具（服务端）
  if (
    packageName === "esbuild" ||
    packageName.startsWith("esbuild/")
  ) {
    return true;
  }
  
  // CSS 处理工具（服务端构建时使用）
  if (
    packageName === "postcss" ||
    packageName.startsWith("postcss/") ||
    packageName === "postcss-v3" ||
    packageName.startsWith("postcss-v3/") ||
    packageName === "autoprefixer" ||
    packageName.startsWith("autoprefixer/") ||
    packageName === "cssnano" ||
    packageName.startsWith("cssnano/") ||
    packageName === "tailwindcss" ||
    packageName.startsWith("tailwindcss/") ||
    packageName === "tailwindcss-v3" ||
    packageName.startsWith("tailwindcss-v3/") ||
    packageName === "@tailwindcss/postcss" ||
    packageName.startsWith("@tailwindcss/postcss/")
  ) {
    return true;
  }
  
  // 包名包含服务端相关关键词（更通用的判断）
  const serverKeywords = [
    "server",
    "backend",
    "deno",
    "node",
    "fs", // 文件系统相关
    "path", // 路径处理（通常是服务端）
    "crypto", // 加密（服务端）
    "http-server",
    "ws-server",
  ];
  
  const lowerPackageName = packageName.toLowerCase();
  if (serverKeywords.some(keyword => lowerPackageName.includes(keyword))) {
    return true;
  }
  
  return false;
}

/**
 * 判断是否为 Preact 相关依赖
 * Preact 相关依赖应该保持 external，通过 import map 在浏览器中加载
 * @param packageName 包名
 * @returns 是否为 Preact 相关依赖
 */
export function isPreactDependency(packageName: string): boolean {
  const preactPackages = [
    "preact",
    "preact/hooks",
    "preact/jsx-runtime",
    "preact/signals",
    "preact-router",
  ];
  
  return preactPackages.some(pkg => packageName === pkg || packageName.startsWith(`${pkg}/`));
}

/**
 * 判断依赖是否应该被打包
 * 优化策略：通过 npm:、jsr: 或 http: 导入的客户端依赖通过 CDN 加载，不打包
 * @param packageName 包名
 * @param importValue import map 中的值
 * @returns 是否应该被打包（false 表示应该保持 external，通过 CDN 加载）
 */
export function shouldBundleDependency(
  packageName: string,
  importValue: string
): boolean {
  // @dreamer/dweb 相关依赖：如果是 JSR URL，不打包，通过网络请求加载
  if (packageName.startsWith("@dreamer/dweb")) {
    // 如果是 JSR URL，不打包
    if (importValue.startsWith("jsr:")) {
      return false;
    }
    // 如果是本地路径，需要打包
    return true;
  }
  
  // 服务端依赖不打包
  if (isServerDependency(packageName)) {
    return false;
  }
  
  // Preact 相关依赖不打包（通过 import map 加载）
  if (isPreactDependency(packageName)) {
    return false;
  }
  
  // 本地路径导入应该被打包（相对路径、绝对路径等）
  if (!importValue.startsWith("jsr:") && 
      !importValue.startsWith("npm:") && 
      !importValue.startsWith("http")) {
    return true;
  }
  
  // 通过 npm: 或 http: 导入的客户端依赖不打包，通过 CDN 加载
  // 这样可以减少打包后的代码体积，提高加载速度
  if (importValue.startsWith("npm:") || importValue.startsWith("http")) {
    return false;
  }
  
  // JSR 导入的客户端依赖也不打包，通过 CDN 加载
  if (importValue.startsWith("jsr:")) {
    return false;
  }
  
  // 其他情况默认打包（兜底逻辑）
  return true;
}

/**
 * 识别常用的共享客户端依赖
 * 这些依赖应该被单独打包成共享 chunk，避免在每个组件中重复打包
 * @param packageName 包名
 * @returns 是否为共享依赖
 */
export function isSharedClientDependency(packageName: string): boolean {
  // 常用的共享客户端依赖列表
  const sharedDependencies = [
    "tailwind-merge",
    "clsx",
    "classnames",
    "date-fns",
    "lodash",
    "lodash-es",
    "uuid",
    "nanoid",
    "zod",
    "yup",
    "validator",
  ];
  
  return sharedDependencies.some(
    (dep) => packageName === dep || packageName.startsWith(`${dep}/`)
  );
}

/**
 * 从 import map 中提取外部依赖列表
 * 包含应该保持 external 的依赖：
 * - preact 相关依赖（通过 CDN 加载）
 * - 服务端依赖（不打包到客户端）
 * - 通过 npm:/http: 导入的客户端依赖（通过 CDN 加载，减少打包体积）
 * @param importMap import map 配置
 * @param bundleClient 是否打包 @dreamer/dweb/client（默认 false，表示保持 external）
 * @param useSharedDeps 是否使用共享依赖机制（默认 false，开发环境可启用）
 * @returns 外部依赖包名数组（子路径导入由插件处理）
 */
export function getExternalPackages(
  importMap: Record<string, string>,
  bundleClient: boolean = false,
  useSharedDeps: boolean = false,
): string[] {
  const externalPackages: string[] = [
    "@dreamer/dweb",
    "preact",
    "preact-render-to-string",
  ];
  
  for (const [key, value] of Object.entries(importMap)) {
    // @dreamer/dweb 相关依赖：如果是 JSR URL，始终不打包，通过网络请求加载
    if (key.startsWith("@dreamer/dweb")) {
      // 如果是 JSR URL，始终保持 external
      if (value.startsWith("jsr:")) {
        externalPackages.push(key);
        continue;
      }
      // @dreamer/dweb/client 根据 bundleClient 参数决定是否打包（仅限本地路径）
      if (key === "@dreamer/dweb/client") {
        if (!bundleClient) {
          externalPackages.push(key);
        }
        continue;
      }
      // 其他 @dreamer/dweb/* 依赖，如果是本地路径，默认不打包（保持 external）
      if (!value.startsWith("http")) {
        externalPackages.push(key);
        continue;
      }
    }
    
    // 如果依赖不应该被打包，则添加到 external 列表
    if (!shouldBundleDependency(key, value)) {
      externalPackages.push(key);
      continue;
    }
    
    // 如果使用共享依赖机制，将共享依赖也标记为 external
    if (useSharedDeps && isSharedClientDependency(key)) {
      externalPackages.push(key);
    }
  }
  
  return externalPackages;
}

/**
 * 提取函数体（使用括号匹配）
 *
 * 该函数通过括号匹配算法提取函数体内容，支持普通函数和箭头函数。
 * 使用字符串状态机处理括号嵌套和字符串字面量，确保正确匹配函数体的开始和结束位置。
 *
 * @param fileContent - 完整的文件内容字符串
 * @param startIndex - 函数声明的开始位置（函数名或箭头函数的位置）
 * @param isArrowFunction - 是否为箭头函数。如果为 true，会查找 `=>` 后的第一个 `{`；如果为 false，会查找参数列表结束后的第一个 `{`
 * @returns 函数体内容（不包含外层花括号），如果无法找到函数体则返回空字符串
 *
 * @example
 * ```typescript
 * const code = `function test(a, b) { return a + b; }`;
 * const body = extractFunctionBody(code, code.indexOf('function test'));
 * // body = " return a + b; "
 * ```
 *
 * @example
 * ```typescript
 * const code = `const test = (a, b) => { return a + b; }`;
 * const body = extractFunctionBody(code, code.indexOf('const test'), true);
 * // body = " return a + b; "
 * ```
 */
export function extractFunctionBody(
  fileContent: string,
  startIndex: number,
  isArrowFunction: boolean = false,
): string {
  let braceStart = -1;

  if (isArrowFunction) {
    // 箭头函数：找到 => 后的第一个 {
    const arrowIndex = fileContent.indexOf("=>", startIndex);
    if (arrowIndex !== -1) {
      braceStart = fileContent.indexOf("{", arrowIndex);
    }
  } else {
    // 普通函数：找到参数列表结束的 ) 后的第一个 {
    let paramCount = 0;
    let paramEnd = -1;
    let inString = false;
    let stringChar: string | null = null;

    const openParen = fileContent.indexOf("(", startIndex);
    if (openParen !== -1) {
      for (let i = openParen; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : "";

        if (!inString && (char === '"' || char === "'" || char === "`")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== "\\") {
          inString = false;
          stringChar = null;
        }

        if (!inString) {
          if (char === "(") paramCount++;
          if (char === ")") {
            paramCount--;
            if (paramCount === 0) {
              paramEnd = i;
              break;
            }
          }
        }
      }
    }

    if (paramEnd !== -1) {
      braceStart = fileContent.indexOf("{", paramEnd);
    }
  }

  if (braceStart === -1) {
    return "";
  }

  // 使用括号匹配找到函数体的结束位置
  let braceCount = 0;
  let braceEnd = braceStart;
  let inString = false;
  let stringChar: string | null = null;

  for (let i = braceStart; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : "";

    if (!inString && (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
      stringChar = null;
    }

    if (!inString) {
      if (char === "{") braceCount++;
      if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          braceEnd = i;
          break;
        }
      }
    }
  }

  if (braceCount === 0) {
    return fileContent.substring(braceStart + 1, braceEnd);
  }
  return "";
}

/**
 * 提取 load 函数体（支持多种写法）
 *
 * 该函数用于从页面模块中提取 `load` 函数体，支持以下所有格式：
 * 
 * 1. 函数声明（Function Declaration）：
 *    - `export function load(...) { ... }` - 无 async
 *    - `export async function load(...) { ... }` - 有 async
 * 
 * 2. 箭头函数（Arrow Function）：
 *    - `export const load = (...) => { ... }` - 无 async，有花括号
 *    - `export const load = async (...) => { ... }` - 有 async，有花括号
 *    - `export const load = (...) => value` - 无 async，无花括号（单行返回，较少见）
 *    - `export const load = async (...) => value` - 有 async，无花括号（单行返回，较少见）
 * 
 * 3. 函数表达式（Function Expression）：
 *    - `export const load = function(...) { ... }` - 无 async
 *    - `export const load = async function(...) { ... }` - 有 async
 * 
 * 注意：
 * - 所有格式都支持类型注解：`(...): ReturnType`
 * - 所有格式都支持解构参数：`({ params, query })`
 * - 所有格式都支持默认参数：`({ params = {} })`
 * - 单行返回的箭头函数（无花括号）会返回空字符串，因为函数体是表达式而非代码块
 *
 * 主要用于分析 `load` 函数中使用的导入，以便在客户端代码中移除不必要的导入。
 *
 * @param fileContent - 完整的文件内容字符串
 * @returns load 函数体内容（不包含外层花括号），如果不存在或无法提取则返回空字符串
 *
 * @example
 * ```typescript
 * // 示例 1: 函数声明
 * const code1 = `
 *   export async function load({ params }) {
 *     return await fetchData(params.id);
 *   }
 * `;
 * const body1 = extractLoadFunctionBody(code1);
 * // body1 = " return await fetchData(params.id); "
 * 
 * // 示例 2: 箭头函数
 * const code2 = `
 *   export const load = async ({ params }) => {
 *     return await fetchData(params.id);
 *   };
 * `;
 * const body2 = extractLoadFunctionBody(code2);
 * // body2 = " return await fetchData(params.id); "
 * 
 * // 示例 3: 函数表达式
 * const code3 = `
 *   export const load = async function({ params }) {
 *     return await fetchData(params.id);
 *   };
 * `;
 * const body3 = extractLoadFunctionBody(code3);
 * // body3 = " return await fetchData(params.id); "
 * ```
 */
export function extractLoadFunctionBody(fileContent: string): string {
  // 查找 load 函数，但排除字符串字面量和注释中的匹配
  let inString = false;
  let stringChar: string | null = null;
  let inSingleLineComment = false;
  let inMultiLineComment = false;

  // 尝试匹配：export function load(...) 或 export async function load(...)
  for (let i = 0; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : "";
    const nextChar = i < fileContent.length - 1 ? fileContent[i + 1] : "";

    // 处理字符串字面量
    if (!inString && !inSingleLineComment && !inMultiLineComment && 
        (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
      stringChar = null;
    }

    // 处理单行注释 //
    if (!inString && !inMultiLineComment && char === "/" && nextChar === "/") {
      inSingleLineComment = true;
    } else if (inSingleLineComment && char === "\n") {
      inSingleLineComment = false;
    }

    // 处理多行注释 /* */
    if (!inString && !inSingleLineComment && char === "/" && nextChar === "*") {
      inMultiLineComment = true;
    } else if (inMultiLineComment && prevChar === "*" && char === "/") {
      inMultiLineComment = false;
    }

    // 只在非字符串、非注释区域检查 load 函数
    if (!inString && !inSingleLineComment && !inMultiLineComment) {
      const remaining = fileContent.substring(i);
      const functionLoadMatch = remaining.match(
        /^export\s+(async\s+)?function\s+load\s*\(/i,
      );
      if (functionLoadMatch) {
        const loadFunctionStart = i;
        const body = extractFunctionBody(fileContent, loadFunctionStart, false);
        return body;
      }
    }
  }

  // 尝试匹配：export const load = ... (箭头函数或函数表达式)
  inString = false;
  stringChar = null;
  inSingleLineComment = false;
  inMultiLineComment = false;
  
  for (let i = 0; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : "";
    const nextChar = i < fileContent.length - 1 ? fileContent[i + 1] : "";

    // 处理字符串字面量
    if (!inString && !inSingleLineComment && !inMultiLineComment && 
        (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
      stringChar = null;
    }

    // 处理单行注释 //
    if (!inString && !inMultiLineComment && char === "/" && nextChar === "/") {
      inSingleLineComment = true;
    } else if (inSingleLineComment && char === "\n") {
      inSingleLineComment = false;
    }

    // 处理多行注释 /* */
    if (!inString && !inSingleLineComment && char === "/" && nextChar === "*") {
      inMultiLineComment = true;
    } else if (inMultiLineComment && prevChar === "*" && char === "/") {
      inMultiLineComment = false;
    }

    // 只在非字符串、非注释区域检查 load 函数
    if (!inString && !inSingleLineComment && !inMultiLineComment) {
      const remaining = fileContent.substring(i);
      const constLoadMatch = remaining.match(/^export\s+const\s+load\s*=\s*/i);
      if (constLoadMatch) {
        const equalSignIndex = i + constLoadMatch[0].length;

        // 检查是否是箭头函数
        // 注意：可能是 async (...) => 或 (...) =>，需要跳过 async 关键字
        let searchStart = equalSignIndex;
        const asyncMatch = fileContent.substring(equalSignIndex).match(/^async\s+/i);
        if (asyncMatch) {
          searchStart = equalSignIndex + asyncMatch[0].length;
        }
        
        const arrowIndex = fileContent.indexOf("=>", searchStart);
        if (arrowIndex !== -1) {
          // 箭头函数
          const body = extractFunctionBody(fileContent, equalSignIndex, true);
          return body;
        }

        // 函数表达式：export const load = function(...) 或 export const load = async function(...)
        const funcKeywordMatch = fileContent.substring(equalSignIndex).match(
          /(async\s+)?function\s*\(/i,
        );
        if (funcKeywordMatch) {
          const funcKeywordIndex = equalSignIndex +
            (funcKeywordMatch.index || 0);
          const body = extractFunctionBody(fileContent, funcKeywordIndex, false);
          return body;
        }
      }
    }
  }

  return "";
}

/**
 * 收集静态导入语句（相对路径导入）
 *
 * 该函数从文件内容中提取所有静态导入语句（相对路径导入），包括：
 * - 命名导入：`import { name1, name2 } from './module'`
 * - 默认导入：`import name from './module'`
 * - 命名空间导入：`import * as name from './module'`
 * - 类型导入：`import type { Type1, Type2 } from './module'`
 *
 * 注意：只收集相对路径导入（以 `./` 或 `../` 开头），不收集绝对路径或 npm 包导入。
 *
 * @param fileContent - 完整的文件内容字符串
 * @returns 导入信息数组，每个元素包含：
 *   - `lineNumber`: 导入语句所在的行号（从 0 开始）
 *   - `names`: 导入的名称数组（包括默认导入、命名导入、命名空间导入）
 *   - `importStatement`: 完整的导入语句字符串
 *   - `fromPath`: 导入路径（相对路径）
 *
 * @example
 * ```typescript
 * const code = `
 *   import { a, b } from './module1';
 *   import defaultName from './module2';
 *   import * as ns from './module3';
 * `;
 * const imports = collectStaticImports(code);
 * // imports = [
 * //   { lineNumber: 1, names: ['a', 'b'], importStatement: "import { a, b } from './module1';", fromPath: './module1' },
 * //   { lineNumber: 2, names: ['defaultName'], importStatement: "import defaultName from './module2';", fromPath: './module2' },
 * //   { lineNumber: 3, names: ['ns'], importStatement: "import * as ns from './module3';", fromPath: './module3' }
 * // ]
 * ```
 */
export function collectStaticImports(fileContent: string): Array<{
  lineNumber: number;
  names: string[];
  importStatement: string;
  fromPath: string;
}> {
  const importRegex =
    /^import\s+(?:(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+)|type\s+\{([^}]+)\})(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"](\.\.?\/[^'"]+)['"];?/gm;
  const importsToCheck: Array<
    { lineNumber: number; names: string[]; importStatement: string; fromPath: string }
  > = [];

  importRegex.lastIndex = 0;
  let importMatch;
  while ((importMatch = importRegex.exec(fileContent)) !== null) {
    const importStatement = importMatch[0];
    const importIndex = importMatch.index || 0;
    const lineNumber =
      fileContent.substring(0, importIndex).split("\n").length - 1;
    const fromPath = importMatch[5] || ""; // 相对路径

    // 提取导入的名称
    const names: string[] = [];
    if (importMatch[1]) {
      // 解构导入：{ name1, name2 }
      names.push(
        ...importMatch[1].split(",").map((n) =>
          n.trim().split(/\s+as\s+/)[0].trim()
        ).filter((n) => n),
      );
    } else if (importMatch[2]) {
      // 命名空间导入：* as name
      names.push(importMatch[2]);
    } else if (importMatch[3]) {
      // 默认导入：import name
      names.push(importMatch[3]);
    } else if (importMatch[4]) {
      // type 导入：import type { name1, name2 }
      names.push(
        ...importMatch[4].split(",").map((n) =>
          n.trim().split(/\s+as\s+/)[0].trim()
        ).filter((n) => n),
      );
    }

    if (names.length > 0) {
      importsToCheck.push({ lineNumber, names, importStatement, fromPath });
    }
  }

  return importsToCheck;
}

/**
 * 收集所有导入语句（包括相对路径和 npm 包导入）
 *
 * 该函数从文件内容中提取所有导入语句，包括：
 * - 相对路径导入：`import { name } from './module'`
 * - npm 包导入：`import { name } from 'package-name'`
 * - 命名导入、默认导入、命名空间导入、类型导入
 *
 * @param fileContent - 完整的文件内容字符串
 * @returns 导入信息数组，每个元素包含：
 *   - `lineNumber`: 导入语句所在的行号（从 0 开始）
 *   - `names`: 导入的名称数组
 *   - `importStatement`: 完整的导入语句字符串
 *   - `fromPath`: 导入路径（相对路径或包名）
 *   - `isRelative`: 是否为相对路径导入
 *
 * @example
 * ```typescript
 * const code = `
 *   import { a } from './module1';
 *   import { b } from 'tailwind-merge';
 * `;
 * const imports = collectAllImports(code);
 * ```
 */
export function collectAllImports(fileContent: string): Array<{
  lineNumber: number;
  names: string[];
  importStatement: string;
  fromPath: string;
  isRelative: boolean;
}> {
  // 匹配所有导入语句（包括相对路径和 npm 包）
  // 分组说明：
  // [1]: 解构导入 { name1, name2 }
  // [2]: 命名空间导入 * as name
  // [3]: 默认导入 name
  // [4]: type 导入 type { name1, name2 }
  // [5]: 导入路径（from 后面的路径）
  const importRegex =
    /^import\s+(?:(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+)|type\s+\{([^}]+)\})(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"];?/gm;
  const importsToCheck: Array<{
    lineNumber: number;
    names: string[];
    importStatement: string;
    fromPath: string;
    isRelative: boolean;
  }> = [];

  importRegex.lastIndex = 0;
  let importMatch;
  while ((importMatch = importRegex.exec(fileContent)) !== null) {
    const importStatement = importMatch[0];
    const importIndex = importMatch.index || 0;
    const lineNumber =
      fileContent.substring(0, importIndex).split("\n").length - 1;
    const fromPath = importMatch[5] || ""; // 导入路径（第6个分组，索引5）
    const isRelative = fromPath.startsWith("./") || fromPath.startsWith("../");

    // 提取导入的名称
    const names: string[] = [];
    if (importMatch[1]) {
      // 解构导入：{ name1, name2 }
      names.push(
        ...importMatch[1].split(",").map((n) =>
          n.trim().split(/\s+as\s+/)[0].trim()
        ).filter((n) => n),
      );
    } else if (importMatch[2]) {
      // 命名空间导入：* as name
      names.push(importMatch[2]);
    } else if (importMatch[3]) {
      // 默认导入：import name
      names.push(importMatch[3]);
    } else if (importMatch[4]) {
      // type 导入：import type { name1, name2 }
      names.push(
        ...importMatch[4].split(",").map((n) =>
          n.trim().split(/\s+as\s+/)[0].trim()
        ).filter((n) => n),
      );
    }

    // 记录所有导入（包括没有显式导入名称的情况，如 import 'package'）
    importsToCheck.push({ lineNumber, names, importStatement, fromPath, isRelative });
  }

  return importsToCheck;
}

/**
 * 查找 load 函数的完整位置（包括 export 关键字到函数结束）
 * @param fileContent 文件内容
 * @returns 函数开始和结束位置，如果不存在则返回 null
 */
function findLoadFunctionRange(
  fileContent: string,
): { start: number; end: number } | null {
  // 查找 load 函数，但排除字符串字面量和注释中的匹配
  let inString = false;
  let stringChar: string | null = null;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let loadFunctionStart: number | null = null;

  // 尝试匹配：export function load(...) 或 export async function load(...)
  for (let i = 0; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : "";
    const nextChar = i < fileContent.length - 1 ? fileContent[i + 1] : "";

    // 处理字符串字面量
    if (!inString && !inSingleLineComment && !inMultiLineComment && 
        (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
      stringChar = null;
    }

    // 处理单行注释 //
    if (!inString && !inMultiLineComment && char === "/" && nextChar === "/") {
      inSingleLineComment = true;
    } else if (inSingleLineComment && char === "\n") {
      inSingleLineComment = false;
    }

    // 处理多行注释 /* */
    if (!inString && !inSingleLineComment && char === "/" && nextChar === "*") {
      inMultiLineComment = true;
    } else if (inMultiLineComment && prevChar === "*" && char === "/") {
      inMultiLineComment = false;
    }

    // 只在非字符串、非注释区域检查 load 函数
    if (!inString && !inSingleLineComment && !inMultiLineComment) {
      const remaining = fileContent.substring(i);
      const functionLoadMatch = remaining.match(
        /^export\s+(async\s+)?function\s+load\s*\(/i,
      );
      if (functionLoadMatch) {
        loadFunctionStart = i;
        break;
      }
    }
  }

  if (loadFunctionStart !== null) {
    // 找到 export 关键字的位置
    const exportStart = fileContent.lastIndexOf("export", loadFunctionStart);
    if (exportStart === -1) return null;

    // 找到函数体的结束位置
    const functionBody = extractFunctionBody(
      fileContent,
      loadFunctionStart,
      false,
    );
    if (!functionBody) return null;

    // 找到函数体的开始位置（第一个 {）
    let paramCount = 0;
    let paramEnd = -1;
    inString = false;
    stringChar = null;

    const openParen = fileContent.indexOf("(", loadFunctionStart);
    if (openParen !== -1) {
      for (let i = openParen; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : "";

        if (!inString && (char === '"' || char === "'" || char === "`")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== "\\") {
          inString = false;
          stringChar = null;
        }

        if (!inString) {
          if (char === "(") paramCount++;
          if (char === ")") {
            paramCount--;
            if (paramCount === 0) {
              paramEnd = i;
              break;
            }
          }
        }
      }
    }

    if (paramEnd === -1) return null;

    const braceStart = fileContent.indexOf("{", paramEnd);
    if (braceStart === -1) return null;

    // 找到函数体的结束位置
    let braceCount = 0;
    let braceEnd = braceStart;
    inString = false;
    stringChar = null;

    for (let i = braceStart; i < fileContent.length; i++) {
      const char = fileContent[i];
      const prevChar = i > 0 ? fileContent[i - 1] : "";

      if (!inString && (char === '"' || char === "'" || char === "`")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== "\\") {
        inString = false;
        stringChar = null;
      }

      if (!inString) {
        if (char === "{") braceCount++;
        if (char === "}") {
          braceCount--;
          if (braceCount === 0) {
            braceEnd = i;
            break;
          }
        }
      }
    }

    if (braceCount !== 0) return null;

    // 找到这一行的结束位置（包括分号和换行）
    let end = braceEnd + 1;
    while (
      end < fileContent.length &&
      (fileContent[end] === " " || fileContent[end] === "\t")
    ) {
      end++;
    }
    // 如果后面有分号，也包含进去
    if (end < fileContent.length && fileContent[end] === ";") {
      end++;
    }
    // 包含换行符
    if (end < fileContent.length && fileContent[end] === "\n") {
      end++;
    }

    return { start: exportStart, end };
  }

  // 尝试匹配：export const load = ... (箭头函数或函数表达式)
  inString = false;
  stringChar = null;
  inSingleLineComment = false;
  inMultiLineComment = false;
  let exportStart: number | null = null;

  for (let i = 0; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : "";
    const nextChar = i < fileContent.length - 1 ? fileContent[i + 1] : "";

    // 处理字符串字面量
    if (!inString && !inSingleLineComment && !inMultiLineComment && 
        (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
      stringChar = null;
    }

    // 处理单行注释 //
    if (!inString && !inMultiLineComment && char === "/" && nextChar === "/") {
      inSingleLineComment = true;
    } else if (inSingleLineComment && char === "\n") {
      inSingleLineComment = false;
    }

    // 处理多行注释 /* */
    if (!inString && !inSingleLineComment && char === "/" && nextChar === "*") {
      inMultiLineComment = true;
    } else if (inMultiLineComment && prevChar === "*" && char === "/") {
      inMultiLineComment = false;
    }

    // 只在非字符串、非注释区域检查 load 函数
    if (!inString && !inSingleLineComment && !inMultiLineComment) {
      const remaining = fileContent.substring(i);
      const constLoadMatch = remaining.match(/^export\s+const\s+load\s*=\s*/i);
      if (constLoadMatch) {
        exportStart = i;
        break;
      }
    }
  }

  if (exportStart !== null) {
    const matchResult = fileContent.substring(exportStart).match(
      /^export\s+const\s+load\s*=\s*/i,
    );
    const equalSignIndex = exportStart +
      (matchResult ? matchResult[0].length : 0);

    // 检查是否是箭头函数
    const arrowIndex = fileContent.indexOf("=>", equalSignIndex);
    if (arrowIndex !== -1) {
      // 箭头函数
      const functionBody = extractFunctionBody(
        fileContent,
        equalSignIndex,
        true,
      );
      if (!functionBody) return null;

      const braceStart = fileContent.indexOf("{", arrowIndex);
      if (braceStart === -1) return null;

      // 找到函数体的结束位置
      let braceCount = 0;
      let braceEnd = braceStart;
      inString = false;
      stringChar = null;

      for (let i = braceStart; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : "";

        if (!inString && (char === '"' || char === "'" || char === "`")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== "\\") {
          inString = false;
          stringChar = null;
        }

        if (!inString) {
          if (char === "{") braceCount++;
          if (char === "}") {
            braceCount--;
            if (braceCount === 0) {
              braceEnd = i;
              break;
            }
          }
        }
      }

      if (braceCount !== 0) return null;

      // 找到这一行的结束位置
      let end = braceEnd + 1;
      while (
        end < fileContent.length &&
        (fileContent[end] === " " || fileContent[end] === "\t")
      ) {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === ";") {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === "\n") {
        end++;
      }

      return { start: exportStart, end };
    }

    // 函数表达式：export const load = function(...) 或 export const load = async function(...)
    const funcKeywordMatch = fileContent.substring(equalSignIndex).match(
      /(async\s+)?function\s*\(/i,
    );
    if (funcKeywordMatch) {
      const funcKeywordIndex = equalSignIndex + (funcKeywordMatch.index || 0);
      const functionBody = extractFunctionBody(
        fileContent,
        funcKeywordIndex,
        false,
      );
      if (!functionBody) return null;

      // 找到函数体的开始位置
      let paramCount = 0;
      let paramEnd = -1;
      inString = false;
      stringChar = null;

      const openParen = fileContent.indexOf("(", funcKeywordIndex);
      if (openParen !== -1) {
        for (let i = openParen; i < fileContent.length; i++) {
          const char = fileContent[i];
          const prevChar = i > 0 ? fileContent[i - 1] : "";

          if (!inString && (char === '"' || char === "'" || char === "`")) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && prevChar !== "\\") {
            inString = false;
            stringChar = null;
          }

          if (!inString) {
            if (char === "(") paramCount++;
            if (char === ")") {
              paramCount--;
              if (paramCount === 0) {
                paramEnd = i;
                break;
              }
            }
          }
        }
      }

      if (paramEnd === -1) return null;

      const braceStart = fileContent.indexOf("{", paramEnd);
      if (braceStart === -1) return null;

      // 找到函数体的结束位置
      let braceCount = 0;
      let braceEnd = braceStart;
      inString = false;
      stringChar = null;

      for (let i = braceStart; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : "";

        if (!inString && (char === '"' || char === "'" || char === "`")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== "\\") {
          inString = false;
          stringChar = null;
        }

        if (!inString) {
          if (char === "{") braceCount++;
          if (char === "}") {
            braceCount--;
            if (braceCount === 0) {
              braceEnd = i;
              break;
            }
          }
        }
      }

      if (braceCount !== 0) return null;

      // 找到这一行的结束位置
      let end = braceEnd + 1;
      while (
        end < fileContent.length &&
        (fileContent[end] === " " || fileContent[end] === "\t")
      ) {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === ";") {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === "\n") {
        end++;
      }

      return { start: exportStart, end };
    }
  }

  return null;
}

/**
 * 移除只在 load 函数中使用的静态导入，并移除整个 load 函数
 *
 * 该函数用于优化客户端代码，移除以下内容：
 * 1. 只在 `load` 函数中使用的静态导入（这些导入在客户端不需要）
 * 2. 整个 `load` 函数（`load` 函数只在服务端执行）
 *
 * 算法流程：
 * 1. 检测是否存在 `load` 函数
 * 2. 收集所有静态导入语句
 * 3. 提取 `load` 函数体
 * 4. 对每个导入，检查是否只在 `load` 函数中使用（通过正则匹配使用次数）
 * 5. 移除只在 `load` 函数中使用的导入
 * 6. 移除整个 `load` 函数
 * 7. 清理空行，保持代码可读性
 *
 * @param fileContent - 完整的文件内容字符串
 * @returns 处理后的文件内容，已移除不必要的导入和 `load` 函数
 *
 * @example
 * ```typescript
 * const code = `
 *   import { fetchData } from './api';  // 只在 load 中使用
 *   import { Component } from './Component';  // 在组件中使用
 *
 *   export async function load() {
 *     return await fetchData();
 *   }
 *
 *   export default function Page() {
 *     return <Component />;
 *   }
 * `;
 * const result = removeLoadOnlyImports(code);
 * // result 中移除了 fetchData 导入和 load 函数，保留了 Component 导入
 * ```
 */
export function removeLoadOnlyImports(fileContent: string): string {
  // 检测是否有 load 函数（排除字符串字面量和注释中的匹配）
  // 先检查是否在字符串中，如果在字符串中则忽略
  const loadFunctionRegex =
    /export\s+(?:const\s+load\s*=|(?:async\s+)?function\s+load\s*\()/i;
  let hasLoadFunction = false;
  let inString = false;
  let stringChar: string | null = null;

  for (let i = 0; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : "";

    // 处理字符串字面量
    if (!inString && (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
      stringChar = null;
    }

    // 只在非字符串区域检查 load 函数
    if (!inString) {
      const remaining = fileContent.substring(i);
      if (loadFunctionRegex.test(remaining)) {
        hasLoadFunction = true;
        break;
      }
    }
  }

  if (!hasLoadFunction) {
    return fileContent;
  }

  // 收集所有静态导入
  const importsToCheck = collectStaticImports(fileContent);

  // 提取 load 函数体（用于判断哪些导入只在 load 中使用）
  const loadFunctionBody = extractLoadFunctionBody(fileContent);

  const lines = fileContent.split("\n");
  const linesToRemove: number[] = [];

  // 如果存在 load 函数体，检查每个导入是否只在 load 函数中使用
  if (loadFunctionBody) {
    for (const imp of importsToCheck) {
      let countInLoad = 0;
      let countInFile = 0;

      for (const name of imp.names) {
        if (!name || !name.trim()) continue;

        const trimmedName = name.trim();
        const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const nameRegex = new RegExp(`\\b${escapedName}\\b`, "g");

        // 在 load 函数中匹配
        const loadMatches = loadFunctionBody.match(nameRegex);
        if (loadMatches) {
          countInLoad += loadMatches.length;
        }

        // 在整个文件中匹配（排除 import 语句）
        const fileWithoutImports = fileContent.replace(
          /^import\s+.*?from\s+['"][^'"]+['"];?/gm,
          "",
        );
        const fileMatches = fileWithoutImports.match(nameRegex);
        if (fileMatches) {
          countInFile += fileMatches.length;
        }
      }

      // 如果 load 函数中的使用次数 = 整个文件中的使用次数，说明只在 load 函数中使用
      if (countInLoad > 0 && countInLoad === countInFile) {
        linesToRemove.push(imp.lineNumber);
      }
    }
  }

  // 移除整个 load 函数
  const loadFunctionRange = findLoadFunctionRange(fileContent);
  if (loadFunctionRange) {
    // 计算 load 函数所在的行号范围
    const startLine =
      fileContent.substring(0, loadFunctionRange.start).split("\n").length - 1;
    const endLine =
      fileContent.substring(0, loadFunctionRange.end).split("\n").length - 1;

    // 标记要移除的行
    for (let i = startLine; i <= endLine; i++) {
      linesToRemove.push(i);
    }
  }

  // 移除标记的行（从后往前移除，避免索引变化）
  linesToRemove.sort((a, b) => b - a).forEach((lineNum) => {
    if (lineNum >= 0 && lineNum < lines.length) {
      lines[lineNum] = "";
    }
  });

  // 重新组合文件内容（移除空行，但保留必要的空行）
  const result = lines
    .map((line, index) => {
    if (linesToRemove.includes(index)) {
      return "";
    }
    return line;
    })
    .filter((line, index, arr) => {
    // 移除连续的空行，但保留单个空行用于代码可读性
    if (line.trim() === "") {
      return index === 0 || arr[index - 1].trim() !== "";
    }
    return true;
    })
    .join("\n");

  return result;
}

/**
 * 使用 esbuild 编译 TypeScript/TSX 文件
 *
 * 该函数使用 esbuild 将 TypeScript/TSX 代码编译为 JavaScript，支持：
 * - TypeScript 语法转换
 * - JSX 自动转换（使用 Preact）
 * - ES 模块格式输出
 *
 * 注意：该函数只进行语法转换，不进行打包或代码分割。
 *
 * @param fileContent - TypeScript/TSX 源代码内容
 * @param fullPath - 完整的文件路径，用于：
 *   - 确定文件类型（`.ts` 或 `.tsx`）
 *   - 设置 sourcefile 选项（用于错误提示和 source map）
 * @returns 编译后的 JavaScript 代码（Promise）
 * @throws {Error} 如果 esbuild.transform 方法不存在或编译结果为空
 *
 * @example
 * ```typescript
 * const tsCode = `
 *   interface Props { name: string; }
 *   export default function Component({ name }: Props) {
 *     return <div>Hello {name}</div>;
 *   }
 * `;
 * const jsCode = await compileWithEsbuild(tsCode, '/path/to/Component.tsx');
 * // jsCode 包含编译后的 JavaScript 代码
 * ```
 */
export async function compileWithEsbuild(
  fileContent: string,
  fullPath: string,
): Promise<string> {
  // esbuild 可能导出为 default 或命名导出
  const esbuildTransform = esbuild.transform ||
    (esbuild as any).default?.transform;
  if (!esbuildTransform || typeof esbuildTransform !== "function") {
    throw new Error("esbuild.transform 方法不存在");
  }

  const transformPromise = esbuildTransform(fileContent, {
    loader: fullPath.endsWith(".tsx") ? "tsx" : "ts",
    jsx: "automatic",
    jsxImportSource: "preact",
    format: "esm",
    target: "esnext",
    sourcefile: fullPath,
  });

  const result = await transformPromise;
  if (!result || !result.code) {
    throw new Error("esbuild 编译结果为空");
  }

  return result.code;
}

/**
 * 替换相对路径导入为 /__modules/ 路径
 *
 * 该函数将编译后的 JavaScript 代码中的相对路径导入（如 `./module`、`../utils`）
 * 替换为框架的模块请求路径（如 `/__modules/...`），以便在运行时通过框架的模块加载器加载。
 *
 * 支持的导入格式：
 * - 静态导入：`import ... from './module'`
 * - 动态导入：`import('./module')`
 *
 * 路径解析规则：
 * - `./module` → 相对于当前文件目录
 * - `../module` → 相对于当前文件父目录
 * - 支持多级相对路径（如 `../../module`）
 *
 * @param jsCode - 编译后的 JavaScript 代码
 * @param filePath - 当前文件的完整路径（用于解析相对路径），例如：`/project/routes/index.tsx`
 * @returns 处理后的代码，所有相对路径导入已替换为 `/__modules/` 路径
 *
 * @example
 * ```typescript
 * const jsCode = `
 *   import { Component } from './Component';
 *   import('./utils').then(m => m.doSomething());
 * `;
 * const result = replaceRelativeImports(jsCode, '/project/routes/index.tsx');
 * // result 中的相对路径被替换为 /__modules/ 路径
 * ```
 */
export function replaceRelativeImports(
  jsCode: string,
  filePath: string,
): string {
  const currentDir = filePath.substring(0, filePath.lastIndexOf("/"));

  // 辅助函数：将相对路径转换为绝对路径
  const resolveRelativePath = (importPath: string): string => {
    const parts = currentDir.split("/").filter((p: string) => p);
    const importParts = importPath.split("/").filter((p: string) => p);

    // 处理 .. 和 . 路径
    for (const part of importParts) {
      if (part === "..") {
        parts.pop();
      } else if (part !== ".") {
        parts.push(part);
      }
    }

    // 转换为 /__modules/ 路径
    const absolutePath = parts.join("/");
    return `/__modules/${encodeURIComponent(absolutePath)}`;
  };

  // 替换 import ... from '相对路径' 中的相对路径
  jsCode = jsCode.replace(
    /from\s+['"](\.\.?\/[^'"]+\.(tsx?|jsx?))['"]/g,
    (match, importPath) => {
      const modulePath = resolveRelativePath(importPath);
      return match.replace(importPath, modulePath);
    },
  );

  // 替换 import('相对路径') 动态导入中的相对路径
  jsCode = jsCode.replace(
    /import\s*\(\s*['"](\.\.?\/[^'"]+\.(tsx?|jsx?))['"]\s*\)/g,
    (match, importPath) => {
      const modulePath = resolveRelativePath(importPath);
      return match.replace(importPath, modulePath);
    },
  );

  return jsCode;
}

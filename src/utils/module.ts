/**
 * 模块处理工具函数
 * 用于代码分析、函数提取、导入处理等
 */

import * as esbuild from "esbuild";

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
  isArrowFunction: boolean = false
): string {
  let braceStart = -1;
  
  if (isArrowFunction) {
    // 箭头函数：找到 => 后的第一个 {
    const arrowIndex = fileContent.indexOf('=>', startIndex);
    if (arrowIndex !== -1) {
      braceStart = fileContent.indexOf('{', arrowIndex);
    }
  } else {
    // 普通函数：找到参数列表结束的 ) 后的第一个 {
    let paramCount = 0;
    let paramEnd = -1;
    let inString = false;
    let stringChar: string | null = null;
    
    const openParen = fileContent.indexOf('(', startIndex);
    if (openParen !== -1) {
      for (let i = openParen; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : '';
        
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = null;
        }
        
        if (!inString) {
          if (char === '(') paramCount++;
          if (char === ')') {
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
      braceStart = fileContent.indexOf('{', paramEnd);
    }
  }
  
  if (braceStart === -1) return '';
  
  // 使用括号匹配找到函数体的结束位置
  let braceCount = 0;
  let braceEnd = braceStart;
  let inString = false;
  let stringChar: string | null = null;
  
  for (let i = braceStart; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : '';
    
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
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
  return '';
}

/**
 * 提取 load 函数体（支持多种写法）
 * 
 * 该函数用于从页面模块中提取 `load` 函数体，支持以下格式：
 * - `export function load(...) { ... }`
 * - `export async function load(...) { ... }`
 * - `export const load = (...) => { ... }` (箭头函数)
 * - `export const load = function(...) { ... }` (函数表达式)
 * 
 * 主要用于分析 `load` 函数中使用的导入，以便在客户端代码中移除不必要的导入。
 * 
 * @param fileContent - 完整的文件内容字符串
 * @returns load 函数体内容（不包含外层花括号），如果不存在则返回空字符串
 * 
 * @example
 * ```typescript
 * const code = `
 *   import { fetchData } from './api';
 *   export async function load({ params }) {
 *     return await fetchData(params.id);
 *   }
 * `;
 * const body = extractLoadFunctionBody(code);
 * // body = " return await fetchData(params.id); "
 * ```
 */
export function extractLoadFunctionBody(fileContent: string): string {
  // 尝试匹配：export function load(...) 或 export async function load(...)
  const functionLoadMatch = fileContent.match(/export\s+(async\s+)?function\s+load\s*\(/i);
  if (functionLoadMatch) {
    const loadFunctionStart = functionLoadMatch.index || 0;
    return extractFunctionBody(fileContent, loadFunctionStart, false);
  }
  
  // 尝试匹配：export const load = ... (箭头函数或函数表达式)
  const constLoadMatch = fileContent.match(/export\s+const\s+load\s*=\s*/i);
  if (constLoadMatch) {
    const equalSignIndex = (constLoadMatch.index || 0) + constLoadMatch[0].length;
    
    // 检查是否是箭头函数
    const arrowIndex = fileContent.indexOf('=>', equalSignIndex);
    if (arrowIndex !== -1) {
      // 箭头函数
      return extractFunctionBody(fileContent, equalSignIndex, true);
    }
    
    // 函数表达式：export const load = function(...) 或 export const load = async function(...)
    const funcKeywordMatch = fileContent.substring(equalSignIndex).match(/(async\s+)?function\s*\(/i);
    if (funcKeywordMatch) {
      const funcKeywordIndex = equalSignIndex + (funcKeywordMatch.index || 0);
      return extractFunctionBody(fileContent, funcKeywordIndex, false);
    }
  }
  
  return '';
}

/**
 * 收集静态导入语句
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
 * //   { lineNumber: 1, names: ['a', 'b'], importStatement: "import { a, b } from './module1';" },
 * //   { lineNumber: 2, names: ['defaultName'], importStatement: "import defaultName from './module2';" },
 * //   { lineNumber: 3, names: ['ns'], importStatement: "import * as ns from './module3';" }
 * // ]
 * ```
 */
export function collectStaticImports(fileContent: string): Array<{
  lineNumber: number;
  names: string[];
  importStatement: string;
}> {
  const importRegex = /^import\s+(?:(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+)|type\s+\{([^}]+)\})(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"](\.\.?\/[^'"]+)['"];?/gm;
  const importsToCheck: Array<{ lineNumber: number; names: string[]; importStatement: string }> = [];
  
  importRegex.lastIndex = 0;
  let importMatch;
  while ((importMatch = importRegex.exec(fileContent)) !== null) {
    const importStatement = importMatch[0];
    const importIndex = importMatch.index || 0;
    const lineNumber = fileContent.substring(0, importIndex).split('\n').length - 1;
    
    // 提取导入的名称
    const names: string[] = [];
    if (importMatch[1]) {
      // 解构导入：{ name1, name2 }
      names.push(...importMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(n => n));
    } else if (importMatch[2]) {
      // 命名空间导入：* as name
      names.push(importMatch[2]);
    } else if (importMatch[3]) {
      // 默认导入：import name
      names.push(importMatch[3]);
    } else if (importMatch[4]) {
      // type 导入：import type { name1, name2 }
      names.push(...importMatch[4].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(n => n));
    }
    
    if (names.length > 0) {
      importsToCheck.push({ lineNumber, names, importStatement });
    }
  }
  
  return importsToCheck;
}

/**
 * 查找 load 函数的完整位置（包括 export 关键字到函数结束）
 * @param fileContent 文件内容
 * @returns 函数开始和结束位置，如果不存在则返回 null
 */
function findLoadFunctionRange(fileContent: string): { start: number; end: number } | null {
  // 尝试匹配：export function load(...) 或 export async function load(...)
  const functionLoadMatch = fileContent.match(/export\s+(async\s+)?function\s+load\s*\(/i);
  if (functionLoadMatch) {
    const loadFunctionStart = functionLoadMatch.index || 0;
    // 找到 export 关键字的位置
    const exportStart = fileContent.lastIndexOf('export', loadFunctionStart);
    if (exportStart === -1) return null;
    
    // 找到函数体的结束位置
    const functionBody = extractFunctionBody(fileContent, loadFunctionStart, false);
    if (!functionBody) return null;
    
    // 找到函数体的开始位置（第一个 {）
    let paramCount = 0;
    let paramEnd = -1;
    let inString = false;
    let stringChar: string | null = null;
    
    const openParen = fileContent.indexOf('(', loadFunctionStart);
    if (openParen !== -1) {
      for (let i = openParen; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : '';
        
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = null;
        }
        
        if (!inString) {
          if (char === '(') paramCount++;
          if (char === ')') {
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
    
    const braceStart = fileContent.indexOf('{', paramEnd);
    if (braceStart === -1) return null;
    
    // 找到函数体的结束位置
    let braceCount = 0;
    let braceEnd = braceStart;
    inString = false;
    stringChar = null;
    
    for (let i = braceStart; i < fileContent.length; i++) {
      const char = fileContent[i];
      const prevChar = i > 0 ? fileContent[i - 1] : '';
      
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = null;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
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
    while (end < fileContent.length && (fileContent[end] === ' ' || fileContent[end] === '\t')) {
      end++;
    }
    // 如果后面有分号，也包含进去
    if (end < fileContent.length && fileContent[end] === ';') {
      end++;
    }
    // 包含换行符
    if (end < fileContent.length && fileContent[end] === '\n') {
      end++;
    }
    
    return { start: exportStart, end };
  }
  
  // 尝试匹配：export const load = ... (箭头函数或函数表达式)
  const constLoadMatch = fileContent.match(/export\s+const\s+load\s*=\s*/i);
  if (constLoadMatch) {
    const exportStart = constLoadMatch.index || 0;
    const equalSignIndex = exportStart + constLoadMatch[0].length;
    
    // 检查是否是箭头函数
    const arrowIndex = fileContent.indexOf('=>', equalSignIndex);
    if (arrowIndex !== -1) {
      // 箭头函数
      const functionBody = extractFunctionBody(fileContent, equalSignIndex, true);
      if (!functionBody) return null;
      
      const braceStart = fileContent.indexOf('{', arrowIndex);
      if (braceStart === -1) return null;
      
      // 找到函数体的结束位置
      let braceCount = 0;
      let braceEnd = braceStart;
      let inString = false;
      let stringChar: string | null = null;
      
      for (let i = braceStart; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : '';
        
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = null;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') {
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
      while (end < fileContent.length && (fileContent[end] === ' ' || fileContent[end] === '\t')) {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === ';') {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === '\n') {
        end++;
      }
      
      return { start: exportStart, end };
    }
    
    // 函数表达式：export const load = function(...) 或 export const load = async function(...)
    const funcKeywordMatch = fileContent.substring(equalSignIndex).match(/(async\s+)?function\s*\(/i);
    if (funcKeywordMatch) {
      const funcKeywordIndex = equalSignIndex + (funcKeywordMatch.index || 0);
      const functionBody = extractFunctionBody(fileContent, funcKeywordIndex, false);
      if (!functionBody) return null;
      
      // 找到函数体的开始位置
      let paramCount = 0;
      let paramEnd = -1;
      let inString = false;
      let stringChar: string | null = null;
      
      const openParen = fileContent.indexOf('(', funcKeywordIndex);
      if (openParen !== -1) {
        for (let i = openParen; i < fileContent.length; i++) {
          const char = fileContent[i];
          const prevChar = i > 0 ? fileContent[i - 1] : '';
          
          if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && prevChar !== '\\') {
            inString = false;
            stringChar = null;
          }
          
          if (!inString) {
            if (char === '(') paramCount++;
            if (char === ')') {
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
      
      const braceStart = fileContent.indexOf('{', paramEnd);
      if (braceStart === -1) return null;
      
      // 找到函数体的结束位置
      let braceCount = 0;
      let braceEnd = braceStart;
      inString = false;
      stringChar = null;
      
      for (let i = braceStart; i < fileContent.length; i++) {
        const char = fileContent[i];
        const prevChar = i > 0 ? fileContent[i - 1] : '';
        
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = null;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') {
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
      while (end < fileContent.length && (fileContent[end] === ' ' || fileContent[end] === '\t')) {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === ';') {
        end++;
      }
      if (end < fileContent.length && fileContent[end] === '\n') {
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
  // 检测是否有 load 函数
  const hasLoadFunction = /export\s+(?:const\s+load\s*=|(?:async\s+)?function\s+load\s*\()/i.test(fileContent);
  if (!hasLoadFunction) {
    return fileContent;
  }
  
  // 收集所有静态导入
  const importsToCheck = collectStaticImports(fileContent);
  
  // 提取 load 函数体（用于判断哪些导入只在 load 中使用）
  const loadFunctionBody = extractLoadFunctionBody(fileContent);
  
  const lines = fileContent.split('\n');
  const linesToRemove: number[] = [];
  
  // 如果存在 load 函数体，检查每个导入是否只在 load 函数中使用
  if (loadFunctionBody) {
    for (const imp of importsToCheck) {
      let countInLoad = 0;
      let countInFile = 0;
      
      for (const name of imp.names) {
        if (!name || !name.trim()) continue;
        
        const trimmedName = name.trim();
        const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`\\b${escapedName}\\b`, 'g');
        
        // 在 load 函数中匹配
        const loadMatches = loadFunctionBody.match(nameRegex);
        if (loadMatches) {
          countInLoad += loadMatches.length;
        }
        
        // 在整个文件中匹配（排除 import 语句）
        const fileWithoutImports = fileContent.replace(/^import\s+.*?from\s+['"][^'"]+['"];?/gm, '');
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
    const startLine = fileContent.substring(0, loadFunctionRange.start).split('\n').length - 1;
    const endLine = fileContent.substring(0, loadFunctionRange.end).split('\n').length - 1;
    
    // 标记要移除的行
    for (let i = startLine; i <= endLine; i++) {
      linesToRemove.push(i);
    }
  }
  
  // 移除标记的行（从后往前移除，避免索引变化）
  linesToRemove.sort((a, b) => b - a).forEach(lineNum => {
    if (lineNum >= 0 && lineNum < lines.length) {
      lines[lineNum] = '';
    }
  });
  
  // 重新组合文件内容（移除空行，但保留必要的空行）
  return lines.map((line, index) => {
    if (linesToRemove.includes(index)) {
      return '';
    }
    return line;
  }).filter((line, index, arr) => {
    // 移除连续的空行，但保留单个空行用于代码可读性
    if (line.trim() === '') {
      return index === 0 || arr[index - 1].trim() !== '';
    }
    return true;
  }).join('\n');
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
export async function compileWithEsbuild(fileContent: string, fullPath: string): Promise<string> {
  // esbuild 可能导出为 default 或命名导出
  const esbuildTransform = esbuild.transform || (esbuild as any).default?.transform;
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
export function replaceRelativeImports(jsCode: string, filePath: string): string {
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


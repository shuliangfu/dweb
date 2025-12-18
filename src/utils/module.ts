/**
 * 模块处理工具函数
 * 用于代码分析、函数提取、导入处理等
 */

import * as esbuild from "esbuild";

/**
 * 提取函数体（使用括号匹配）
 * @param fileContent 文件内容
 * @param startIndex 开始位置
 * @param isArrowFunction 是否为箭头函数
 * @returns 函数体内容
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
 * @param fileContent 文件内容
 * @returns load 函数体内容，如果不存在则返回空字符串
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
 * @param fileContent 文件内容
 * @returns 导入信息数组
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
 * @param fileContent 文件内容
 * @returns 处理后的文件内容
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
 * @param fileContent 文件内容
 * @param fullPath 完整文件路径
 * @returns 编译后的 JavaScript 代码
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
 * @param jsCode 编译后的 JavaScript 代码
 * @param filePath 当前文件路径（用于解析相对路径）
 * @returns 处理后的代码
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

/**
 * 从编译后的 JavaScript 代码中移除 load 函数
 * 用于生产环境，处理已编译的 JS 文件
 * @param jsCode 编译后的 JavaScript 代码
 * @returns 处理后的代码（已移除 load 函数）
 */
export function removeLoadFromCompiledJS(jsCode: string): string {
  // 检测是否有 load 函数导出
  // 匹配多种可能的格式：
  // 1. export function load(...)
  // 2. export async function load(...)
  // 3. export const load = ...
  // 4. export{load} 或 export{load as ...}
  const hasLoadExport = /export\s+(?:async\s+)?function\s+load\s*\(|export\s+const\s+load\s*=|export\s*\{[^}]*\bload\b/i.test(jsCode);
  
  if (!hasLoadExport) {
    return jsCode;
  }
  
  let result = jsCode;
  
  // 1. 匹配并移除：export function load(...) 或 export async function load(...)
  // 使用括号匹配找到完整的函数体
  const functionLoadRegex = /export\s+(?:async\s+)?function\s+load\s*\(/gi;
  let match;
  while ((match = functionLoadRegex.exec(result)) !== null) {
    const startIndex = match.index;
    // 找到参数列表结束的 )
    let paramEnd = startIndex + match[0].length - 1;
    let parenCount = 1;
    let inString = false;
    let stringChar: string | null = null;
    
    for (let i = paramEnd + 1; i < result.length; i++) {
      const char = result[i];
      const prevChar = i > 0 ? result[i - 1] : '';
      
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = null;
      }
      
      if (!inString) {
        if (char === '(') parenCount++;
        if (char === ')') {
          parenCount--;
          if (parenCount === 0) {
            paramEnd = i;
            break;
          }
        }
      }
    }
    
    // 找到函数体开始的 {
    const braceStart = result.indexOf('{', paramEnd);
    if (braceStart === -1) continue;
    
    // 使用括号匹配找到函数体结束的 }
    let braceCount = 1;
    let braceEnd = braceStart;
    inString = false;
    stringChar = null;
    
    for (let i = braceStart + 1; i < result.length; i++) {
      const char = result[i];
      const prevChar = i > 0 ? result[i - 1] : '';
      
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
    
    // 移除整个函数（包括 export 关键字）
    // 找到 export 关键字的位置
    let exportStart = startIndex;
    while (exportStart > 0 && /\s/.test(result[exportStart - 1])) {
      exportStart--;
    }
    while (exportStart > 0 && result.substring(Math.max(0, exportStart - 6), exportStart) !== 'export') {
      exportStart--;
    }
    if (exportStart > 0 && result.substring(exportStart, exportStart + 6) === 'export') {
      // 移除从 export 到函数结束的所有内容
      result = result.substring(0, exportStart) + result.substring(braceEnd + 1);
      // 重置正则表达式
      functionLoadRegex.lastIndex = 0;
    }
  }
  
  // 2. 匹配并移除：export const load = ... (箭头函数或函数表达式)
  const constLoadRegex = /export\s+const\s+load\s*=\s*/gi;
  while ((match = constLoadRegex.exec(result)) !== null) {
    const startIndex = match.index;
    const equalIndex = startIndex + match[0].length - 1;
    
    // 检查是否是箭头函数
    const arrowIndex = result.indexOf('=>', equalIndex);
    if (arrowIndex !== -1) {
      // 箭头函数：找到 => 后的第一个 {
      const braceStart = result.indexOf('{', arrowIndex);
      if (braceStart === -1) continue;
      
      // 使用括号匹配找到函数体结束
      let braceCount = 1;
      let braceEnd = braceStart;
      let inString = false;
      let stringChar: string | null = null;
      
      for (let i = braceStart + 1; i < result.length; i++) {
        const char = result[i];
        const prevChar = i > 0 ? result[i - 1] : '';
        
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
      
      // 移除整个 export const load = ... 语句
      let exportStart = startIndex;
      while (exportStart > 0 && /\s/.test(result[exportStart - 1])) {
        exportStart--;
      }
      while (exportStart > 0 && result.substring(Math.max(0, exportStart - 6), exportStart) !== 'export') {
        exportStart--;
      }
      if (exportStart > 0 && result.substring(exportStart, exportStart + 6) === 'export') {
        // 找到语句结束（分号或换行）
        let statementEnd = braceEnd + 1;
        while (statementEnd < result.length && /\s/.test(result[statementEnd])) {
          statementEnd++;
        }
        if (statementEnd < result.length && result[statementEnd] === ';') {
          statementEnd++;
        }
        
        result = result.substring(0, exportStart) + result.substring(statementEnd);
        constLoadRegex.lastIndex = 0;
      }
    }
  }
  
  // 3. 处理命名导出：export { ... as load } 或 export { V as load, ... }
  // 先找到导出语句中哪个变量被导出为 load
  const namedExportPattern = /export\s*\{([^}]+)\}/g;
  let loadVariableName: string | null = null;
  
  // 查找导出语句，找到被导出为 load 的变量名
  let exportMatch;
  while ((exportMatch = namedExportPattern.exec(result)) !== null) {
    const exports = exportMatch[1];
    // 匹配：V as load 或 load 或 load as ...
    const loadExportMatch = exports.match(/(\w+)\s+as\s+load\b|^load\b|\bload\b\s+as\s+(\w+)/i);
    if (loadExportMatch) {
      // 找到变量名（可能是第一个捕获组或第二个捕获组）
      loadVariableName = loadExportMatch[1] || loadExportMatch[2] || 'load';
      break;
    }
  }
  
  // 4. 如果找到了 load 变量名，移除该变量的定义
  if (loadVariableName && loadVariableName !== 'load') {
    // 匹配变量定义：var V=... 或 const V=... 或 let V=...
    // 需要匹配到完整的赋值语句（可能是箭头函数、函数表达式等）
    const varPattern = new RegExp(`(?:var|const|let)\\s+${loadVariableName}\\s*=`, 'g');
    let varMatch;
    while ((varMatch = varPattern.exec(result)) !== null) {
      const varStart = varMatch.index;
      const afterEqual = varStart + varMatch[0].length;
      
      // 找到赋值表达式的结束位置
      // 可能是箭头函数、函数表达式、或其他表达式
      let expressionEnd = -1;
      let braceCount = 0;
      let parenCount = 0;
      let inString = false;
      let stringChar: string | null = null;
      
      // 先检查是否是箭头函数
      const arrowIndex = result.indexOf('=>', afterEqual);
      if (arrowIndex !== -1) {
        // 箭头函数：找到 => 后的函数体
        const arrowBodyStart = arrowIndex + 2;
        // 跳过箭头后的空格
        let bodyStart = arrowBodyStart;
        while (bodyStart < result.length && /\s/.test(result[bodyStart])) {
          bodyStart++;
        }
        
        // 如果是 { 开头，需要匹配括号
        if (result[bodyStart] === '{') {
          braceCount = 1;
          for (let i = bodyStart + 1; i < result.length; i++) {
            const char = result[i];
            const prevChar = i > 0 ? result[i - 1] : '';
            
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
                  expressionEnd = i + 1;
                  break;
                }
              }
            }
          }
        } else {
          // 箭头函数但函数体不是 { }，找到下一个分号或逗号
          for (let i = bodyStart; i < result.length; i++) {
            const char = result[i];
            const prevChar = i > 0 ? result[i - 1] : '';
            
            if (!inString && (char === '"' || char === "'" || char === '`')) {
              inString = true;
              stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
              inString = false;
              stringChar = null;
            }
            
            if (!inString && (char === ';' || (char === ',' && i > afterEqual + 10))) {
              expressionEnd = i;
              break;
            }
          }
        }
      } else {
        // 不是箭头函数，可能是函数表达式或普通表达式
        // 查找 async 关键字
        const asyncIndex = result.indexOf('async', afterEqual);
        if (asyncIndex !== -1 && asyncIndex < afterEqual + 20) {
          // 可能是 async function(...) 或 async (...)
          const funcStart = result.indexOf('(', asyncIndex);
          if (funcStart !== -1) {
            // 找到参数列表结束
            parenCount = 1;
            for (let i = funcStart + 1; i < result.length; i++) {
              const char = result[i];
              const prevChar = i > 0 ? result[i - 1] : '';
              
              if (!inString && (char === '"' || char === "'" || char === '`')) {
                inString = true;
                stringChar = char;
              } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = null;
              }
              
              if (!inString) {
                if (char === '(') parenCount++;
                if (char === ')') {
                  parenCount--;
                  if (parenCount === 0) {
                    // 找到函数体开始
                    const braceStart = result.indexOf('{', i);
                    if (braceStart !== -1) {
                      braceCount = 1;
                      for (let j = braceStart + 1; j < result.length; j++) {
                        const char2 = result[j];
                        const prevChar2 = j > 0 ? result[j - 1] : '';
                        
                        if (!inString && (char2 === '"' || char2 === "'" || char2 === '`')) {
                          inString = true;
                          stringChar = char2;
                        } else if (inString && char2 === stringChar && prevChar2 !== '\\') {
                          inString = false;
                          stringChar = null;
                        }
                        
                        if (!inString) {
                          if (char2 === '{') braceCount++;
                          if (char2 === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                              expressionEnd = j + 1;
                              break;
                            }
                          }
                        }
                      }
                    }
                    break;
                  }
                }
              }
            }
          }
        }
      }
      
      // 如果没找到结束位置，尝试找到下一个分号
      if (expressionEnd === -1) {
        for (let i = afterEqual; i < result.length; i++) {
          const char = result[i];
          if (char === ';' && !inString) {
            expressionEnd = i + 1;
            break;
          }
          if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && (i === 0 || result[i - 1] !== '\\')) {
            inString = false;
            stringChar = null;
          }
        }
      }
      
      if (expressionEnd > varStart) {
        // 移除变量定义（包括前面的 var/const/let 关键字）
        // 找到语句开始位置（可能是上一行的结束）
        let statementStart = varStart;
        while (statementStart > 0 && /\s/.test(result[statementStart - 1])) {
          statementStart--;
        }
        
        // 移除整个语句
        result = result.substring(0, statementStart) + result.substring(expressionEnd);
        // 重置正则表达式
        varPattern.lastIndex = 0;
      }
    }
  }
  
  // 5. 处理命名导出：export { load } 或 export { V as load, ... }
  const namedExportPattern2 = /export\s*\{([^}]+)\}/g;
  result = result.replace(namedExportPattern2, (_match, exports) => {
    // 移除 load 相关的导出
    const exportList = exports
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => {
        // 移除：load、V as load、load as ...
        return !/^load\b/.test(e) && !/\bas\s+load\b/i.test(e) && !/^load\b.*\bas\s+/.test(e);
      });
    
    if (exportList.length > 0) {
      return `export { ${exportList.join(', ')} }`;
    }
    // 如果所有导出都被移除了，移除整个 export 语句
    return '';
  });
  
  // 清理多余的空行和连续的分号
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  result = result.replace(/;;+/g, ';');
  
  return result;
}


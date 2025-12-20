/**
 * 文档加载工具
 * 用于读取和解析 markdown 文档
 */

import * as path from '@std/path';

/**
 * 读取文档内容
 * @param docName 文档名称（不包含 .md 扩展名）
 * @returns 文档内容
 */
export async function loadDoc(docName: string): Promise<string> {
  try {
    // 从项目根目录的 docs 文件夹读取
    const docsPath = path.join(Deno.cwd(), 'docs', `${docName}.md`);
    const content = await Deno.readTextFile(docsPath);
    return content;
  } catch (error) {
    console.error(`读取文档 ${docName} 失败:`, error);
    return `# 文档加载失败\n\n无法加载文档: ${docName}`;
  }
}

/**
 * 简单的 markdown 转 HTML 转换器
 * @param md Markdown 内容
 * @returns HTML 内容
 */
export function markdownToHtml(md: string): string {
  let html = md;
  
  // 代码块（需要先处理，避免被其他规则影响）
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'text';
    const escapedCode = code
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    return `<div class="my-6"><div class="bg-gray-900 rounded-lg overflow-hidden border border-gray-700"><div class="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700"><span class="text-xs text-gray-400 uppercase font-medium">${language}</span><button type="button" onclick="navigator.clipboard.writeText(\`${escapedCode.replace(/`/g, '\\`')}\`)" class="text-xs text-gray-400 hover:text-gray-200 transition-colors">复制</button></div><pre class="p-4 overflow-x-auto"><code class="language-${language} text-sm text-gray-100 font-mono">${escapedCode}</code></pre></div></div>`;
  });
  
  // 标题
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-xl font-bold text-gray-900 mt-8 mb-3">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold text-gray-900 mt-10 mb-4">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold text-gray-900 mt-12 mb-8">$1</h1>');
  
  // 行内代码
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">$1</code>');
  
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 hover:text-indigo-700 hover:underline">$1</a>');
  
  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
  
  // 斜体
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  
  // 无序列表
  const lines = html.split('\n');
  let inList = false;
  let listItems: string[] = [];
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^[\-\*] (.+)$/);
    
    if (listMatch) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(`<li class="ml-6 mb-2 text-gray-700">${listMatch[1]}</li>`);
    } else {
      if (inList) {
        processedLines.push(`<ul class="list-disc list-inside space-y-2 my-4">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      processedLines.push(line);
    }
  }
  
  if (inList) {
    processedLines.push(`<ul class="list-disc list-inside space-y-2 my-4">${listItems.join('')}</ul>`);
  }
  
  html = processedLines.join('\n');
  
  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-6 mb-2 text-gray-700">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 text-gray-700">.*<\/li>)/s, (match) => {
    if (match.includes('</li>')) {
      return `<ol class="list-decimal list-inside space-y-2 my-4">${match}</ol>`;
    }
    return match;
  });
  
  // 段落（处理连续的空行）
  html = html.split(/\n\n+/).map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed; // 已经是 HTML 标签
    if (trimmed.startsWith('#')) return trimmed; // 标题
    return `<p class="text-gray-700 leading-relaxed mb-4">${trimmed}</p>`;
  }).join('\n');
  
  // 水平线
  html = html.replace(/^---$/gim, '<hr class="my-8 border-gray-200" />');
  
  // 转义 HTML 特殊字符（但保留已生成的 HTML 标签）
  // 这里需要更智能的处理，暂时跳过
  
  return html;
}


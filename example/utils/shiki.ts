
import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Highlighter | null = null;

/**
 * 初始化 Shiki 高亮器
 * 必须在服务器启动时调用
 */
export async function initShiki() {
  if (highlighter) return;
  
  highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [
      'javascript', 'typescript', 'tsx', 'jsx', 
      'json', 'css', 'html', 'bash', 'shell', 'sh',
      'markdown', 'yaml', 'sql', 'docker', 'dockerfile'
    ],
  });
  console.log('Shiki initialized');
}

/**
 * 高亮代码
 * @param code 代码内容
 * @param lang 语言
 * @returns 高亮后的 HTML
 */
export function highlight(code: string, lang: string = 'text'): string {
  if (!highlighter) {
    // 如果在客户端调用或者未初始化，返回原始内容（经过转义）
    return escapeHtml(code);
  }

  try {
    // 语言别名映射
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'sh': 'bash',
      'shell': 'bash',
      'dockerfile': 'docker',
    };
    
    const mappedLang = langMap[lang] || lang;
    const loadedLangs = highlighter.getLoadedLanguages();
    
    // 如果语言不支持，降级为 text
    const finalLang = loadedLangs.includes(mappedLang) ? mappedLang : 'text';

    return highlighter.codeToHtml(code, {
      lang: finalLang,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      // 使用 CSS 变量支持暗色模式切换
      defaultColor: false, 
    });
  } catch (e) {
    console.error(`Shiki highlight error for lang ${lang}:`, e);
    return escapeHtml(code);
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

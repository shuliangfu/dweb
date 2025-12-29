/**
 * 代码块组件
 * 用于展示代码示例，支持服务端语法高亮 (Shiki)
 */

import { IS_SERVER } from "@dreamer/dweb/client";
import { useEffect, useState } from "preact/hooks";
import { highlight, initShiki } from "../utils/shiki.ts";

if (IS_SERVER) {
  await initShiki();
}

interface CodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 语言类型 */
  language?: string;
  /** 标题 */
  title?: string;
}

/**
 * 简单的字符串哈希函数
 * 用于生成确定的 ID，确保服务端和客户端一致，避免 Hydration Mismatch
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `cb-${hash.toString(36)}`;
}

/**
 * 代码块组件
 *
 * 服务端：使用 Shiki 生成高亮 HTML，并注入到全局变量中
 * 客户端：从全局变量读取 HTML，保持 Hydration 一致性
 *
 * 优势：客户端不需要加载任何高亮库 (0 JS)，且无 Hydration Mismatch
 */
export default function CodeBlock(
  { code, language = "text", title }: CodeBlockProps,
) {
  // 使用代码内容的哈希作为 ID，确保 SSR 和 CSR 一致
  const safeId = simpleHash(code);

  const [clientContent, setClientContent] = useState<string>("");
  let content = "";

  if (IS_SERVER) {
    try {
      content = highlight(code, language);
    } catch (e) {
      console.error("CodeBlock highlight error:", e);
      content =
        `<pre class="shiki"><code class="language-${language}">${code}</code></pre>`;
    }
  } else {
    // 客户端：优先使用 SSR 注入的内容
    // deno-lint-ignore no-explicit-any
    const win = window as any;
    if (
      typeof window !== "undefined" && win.__CODE_BLOCKS__ &&
      win.__CODE_BLOCKS__[safeId]
    ) {
      content = win.__CODE_BLOCKS__[safeId];
    } else {
      content = clientContent ||
        `<pre class="shiki"><code class="language-${language}">${code}</code></pre>`;
    }
  }

  // 客户端：在挂载后进行按需高亮（用于 CSR 或混合渲染但无 SSR 注入的情况）
  useEffect(() => {
    if (IS_SERVER) return;
    // deno-lint-ignore no-explicit-any
    const win = window as any;
    if (win.__CODE_BLOCKS__ && win.__CODE_BLOCKS__[safeId]) {
      setClientContent(win.__CODE_BLOCKS__[safeId]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // 直接使用浏览器可用的 CDN URL，避免 npm: 前缀在浏览器无法解析
        const { createHighlighter } = await import("shiki");
        const highlighter = await createHighlighter({
          themes: ["github-dark"],
          langs: [
            "javascript",
            "typescript",
            "tsx",
            "jsx",
            "json",
            "css",
            "html",
            "bash",
            "shell",
            "sh",
            "markdown",
            "yaml",
            "sql",
            "docker",
            "dockerfile",
          ],
        });
        const html = highlighter.codeToHtml(code, {
          lang: language,
          theme: "github-dark",
        });
        if (!cancelled) {
          setClientContent(html);
        }
      } catch {
        // 忽略失败，保持降级内容
      }
    })();
    return () => {
      cancelled = true;
    };
    // 依赖 ID、代码和语言，确保内容变化时重新渲染
  }, [safeId, code, language]);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg my-4">
      {title && (
        <div className="bg-gray-800 dark:bg-gray-900 text-gray-200 dark:text-gray-300 px-4 py-2 text-sm font-medium border-b border-gray-700 dark:border-gray-800">
          {title}
        </div>
      )}
      <div className="text-sm font-mono leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>

      {/* 仅在服务端注入数据脚本 */}
      {IS_SERVER && (
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(window.__CODE_BLOCKS__=window.__CODE_BLOCKS__||{})['${safeId}']=${
                JSON.stringify(content)
              };`,
          }}
        />
      )}
    </div>
  );
}

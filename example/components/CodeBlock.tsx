/**
 * 代码块组件
 * 用于展示代码示例
 * (已移除 Shiki 代码高亮，仅做基本展示)
 */

import { IS_SERVER } from "@dreamer/dweb/client";
import { highlight } from "../utils/shiki.ts";

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
 * 服务端：生成转义后的 HTML，并注入到全局变量中
 * 客户端：从全局变量读取 HTML，保持 Hydration 一致性
 */
export default function CodeBlock(
  { code, language = "text", title }: CodeBlockProps,
) {
  // 使用代码内容的哈希作为 ID，确保 SSR 和 CSR 一致
  const safeId = simpleHash(code);

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
      content = highlight(code, language);
    }
  }

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

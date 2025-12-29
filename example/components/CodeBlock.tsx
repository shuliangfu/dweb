/**
 * 代码块组件
 * 用于展示代码示例，支持服务端语法高亮 (Shiki)
 */

import { useId } from "preact/hooks";
import { highlight } from "../utils/shiki.ts";

interface CodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 语言类型 */
  language?: string;
  /** 标题 */
  title?: string;
}

declare global {
  interface Window {
    __CODE_BLOCKS__?: Record<string, string>;
  }
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
  const id = useId();
  // 移除冒号以确保作为 key 安全
  const safeId = `cb-${id.replace(/:/g, "-")}`;
  const isServer = typeof Deno !== "undefined";

  let content = "";

  if (isServer) {
    try {
      content = highlight(code, language);
    } catch (e) {
      console.error("CodeBlock highlight error:", e);
      content =
        `<pre class="shiki"><code class="language-${language}">${code}</code></pre>`;
    }
  } else {
    // 客户端：尝试从全局存储获取，如果失败则降级显示原始内容
    if (
      typeof window !== "undefined" && window.__CODE_BLOCKS__ &&
      window.__CODE_BLOCKS__[safeId]
    ) {
      content = window.__CODE_BLOCKS__[safeId];
    } else {
      // 最后的降级：显示未高亮的代码
      // 注意：这可能会导致 hydration mismatch 如果服务端成功渲染了但脚本没执行
      // 但通常脚本会随 HTML 一起下发并执行
      content =
        `<pre class="shiki"><code class="language-${language}">${code}</code></pre>`;
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
      {isServer && (
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

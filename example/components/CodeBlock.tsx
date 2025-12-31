/**
 * 代码块组件
 * 用于展示代码示例
 * (已移除 Shiki 代码高亮，仅做基本展示)
 */

import { IS_SERVER } from "@dreamer/dweb/client";
import { useState } from "preact/hooks";

interface CodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 语言类型 */
  language?: string;
  /** 标题 */
  title?: string;
  /** 样式变体 */
  variant?: "default" | "terminal";
  /** 自定义类名 */
  className?: string;
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
  { code, language = "text", title, variant = "default" }: CodeBlockProps,
) {
  // 使用代码内容的哈希作为 ID，确保 SSR 和 CSR 一致
  const safeId = simpleHash(code);
  const [copied, setCopied] = useState(false);

  // 简单的 HTML 转义
  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const content =
    `<pre class="shiki"><code class="language-${language}">${escapedCode}</code></pre>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (variant === "terminal") {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-auto flex flex-col transform transition-all hover:shadow-3xl">
        {/* Terminal Header */}
        <div className="flex items-center px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 relative flex-none">
          <div className="flex space-x-2 absolute left-4">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]">
            </div>
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]">
            </div>
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]">
            </div>
          </div>
          <div className="mx-auto text-xs text-gray-900 dark:text-gray-100 font-mono font-medium opacity-70">
            {title || "Terminal"}
          </div>
        </div>

        {/* Terminal Content - Always Dark */}
        <div className="relative group bg-gray-800 flex-1 flex flex-col min-h-0">
          {/* 复制按钮 */}
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 hover:bg-white/20 focus:opacity-100 focus:outline-none text-gray-300"
            title="Copy code"
          >
            {copied
              ? (
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )
              : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
          </button>

          <div className="text-sm font-mono leading-relaxed overflow-auto custom-scrollbar p-6 flex-1 flex flex-col">
            <div
              className="text-gray-300 flex-1 flex flex-col [&>pre]:flex-1 [&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-0 [&>code]:block [&>code]:min-h-full"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
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

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-auto flex flex-col transform transition-all hover:shadow-3xl">
      {/* Default Header - Dark background */}
      <div className="flex items-center px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 relative flex-none">
        <div className="mx-auto text-xs text-gray-900 dark:text-gray-100 font-mono font-medium opacity-70">
          {title || "Code"}
        </div>
      </div>

      {/* Content - Always Dark */}
      <div className="relative group bg-gray-800 flex-1 flex flex-col min-h-0">
        {/* 复制按钮 */}
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 hover:bg-white/20 focus:opacity-100 focus:outline-none text-gray-300"
          title="Copy code"
        >
          {copied
            ? (
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )
            : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
        </button>

        <div className="text-sm font-mono leading-relaxed overflow-auto custom-scrollbar p-6 flex-1 flex flex-col">
          <div
            className="text-gray-300 flex-1 flex flex-col [&>pre]:flex-1 [&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-0 [&>code]:block [&>code]:min-h-full"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}

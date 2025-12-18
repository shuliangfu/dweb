/**
 * 代码块组件
 * 用于展示代码示例，支持语法高亮
 */

import { useEffect, useRef } from 'preact/hooks';

interface CodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 语言类型 */
  language?: string;
  /** 标题 */
  title?: string;
}

/**
 * Prism.js 类型定义
 */
interface PrismType {
  highlightElement: (element: HTMLElement) => void;
}

/**
 * 扩展 globalThis 类型以包含 Prism
 */
declare global {
  var Prism: PrismType | undefined;
}

/**
 * 代码块组件
 * 使用 Prism.js 进行语法高亮
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function CodeBlock({ code, language = 'bash', title }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  /**
   * 在客户端执行语法高亮
   */
  useEffect(() => {
    if (typeof globalThis !== 'undefined' && codeRef.current) {
      // 等待 Prism.js 加载完成
      const highlightCode = () => {
        if (globalThis.Prism && codeRef.current) {
          // 设置语言类名
          const langClass = `language-${language}`;
          codeRef.current.className = langClass;
          
          // 执行高亮
          globalThis.Prism.highlightElement(codeRef.current);
        }
      };

      // 如果 Prism 已加载，直接执行高亮
      if (globalThis.Prism) {
        highlightCode();
      } else {
        // 等待 Prism 加载完成
        const checkPrism = setInterval(() => {
          if (globalThis.Prism) {
            clearInterval(checkPrism);
            highlightCode();
          }
        }, 50);

        // 5秒后停止检查（避免无限等待）
        setTimeout(() => clearInterval(checkPrism), 5000);
      }
    }
  }, [code, language]);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-lg">
      {title && (
        <div className="bg-gray-800 text-gray-200 px-4 py-2 text-sm font-medium">
          {title}
        </div>
      )}
      <div className="bg-gray-900 p-6 overflow-x-auto">
        <pre className="text-sm font-mono">
          <code ref={codeRef} className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}


/**
 * 代码块组件
 * 用于显示代码示例，支持语法高亮
 */

interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * 代码块组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
  return (
    <div className="relative my-4">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {/* 代码块头部 */}
        <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
          <span className="text-xs text-gray-400 uppercase">{language}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(code);
              // 可以添加复制成功的提示
            }}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            复制
          </button>
        </div>
        {/* 代码内容 */}
        <pre className="p-4 overflow-x-auto">
          <code className={`language-${language} text-sm text-gray-100`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}


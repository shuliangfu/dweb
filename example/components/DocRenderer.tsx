/**
 * 文档渲染组件
 * 根据 content 数据结构渲染文档页面
 */

import CodeBlock from "./CodeBlock.tsx";

/**
 * 内容块类型定义
 */
type ContentBlock =
  | { type: "text"; content: string }
  | { type: "code"; code: string; language: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "api"; name: string; description?: string; code?: string }
  | {
    type: "subsection";
    level: 3 | 4;
    title: string;
    blocks?: ContentBlock[];
  }
  | {
    type: "alert";
    level: "info" | "warning" | "error" | "success";
    content: string | string[];
  };

/**
 * 章节类型定义
 */
type Section = {
  title: string;
  blocks?: ContentBlock[];
};

/**
 * 页面数据接口
 */
interface PageData {
  title: string;
  description?: string;
  sections: Section[];
}

interface DocRendererProps {
  content: PageData;
}

/**
 * 渲染内容块
 */
function renderBlock(block: ContentBlock) {
  switch (block.type) {
    case "text": {
      // 处理 Markdown 格式的文本（简单的 code 和链接）
      const content = block.content
        .replace(/`([^`]+)`/g, (_match: string, code: string) => {
          return `<code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">${code}</code>`;
        })
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          (_match: string, text: string, url: string) => {
            const isExternal = url.startsWith("http");
            return `<a href="${url}" ${
              isExternal ? 'target="_blank" rel="noopener noreferrer" ' : ""
            }class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">${text}</a>`;
          },
        );
      return (
        <p
          className="text-gray-600 dark:text-gray-300 mb-4 mt-4"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    case "code": {
      return (
        <div className="mb-4">
          <CodeBlock code={block.code} language={block.language} />
        </div>
      );
    }
    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag
          className={`${
            block.ordered ? "list-decimal" : "list-disc"
          } list-inside text-gray-600 dark:text-gray-300 space-y-2 ${
            block.ordered ? "" : "mt-4"
          }`}
        >
          {block.items.map((item: string, index: number) => {
            // 处理 Markdown 格式（包括链接、粗体、代码）
            const processedItem = item
              .replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                (_match: string, text: string, url: string) => {
                  const isExternal = url.startsWith("http");
                  return `<a href="${url}" ${
                    isExternal ? 'target="_blank" rel="noopener noreferrer" ' : ""
                  }class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">${text}</a>`;
                },
              )
              .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
              .replace(/`([^`]+)`/g, (_match: string, code: string) => {
                return `<code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">${code}</code>`;
              });
            return (
              <li
                key={index}
                dangerouslySetInnerHTML={{ __html: processedItem }}
              />
            );
          })}
        </ListTag>
      );
    }
    case "api": {
      return (
        <div className="mb-6">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              {block.name}
            </code>
          </h4>
          {block.description && (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              {block.description}
            </p>
          )}
          {block.code && <CodeBlock code={block.code} language="typescript" />}
        </div>
      );
    }
    case "subsection": {
      const HeadingTag = block.level === 3 ? "h3" : "h4";
      return (
        <div className={block.level === 3 ? "mt-8" : "mt-6"}>
          <HeadingTag
            className={`${
              block.level === 3 ? "text-2xl" : "text-xl"
            } font-bold text-gray-${
              block.level === 3 ? "800" : "900"
            } dark:text-gray-${block.level === 3 ? "200" : "white"} mb-4`}
          >
            {block.title}
          </HeadingTag>
          {block.blocks?.map((subBlock: ContentBlock, index: number) => (
            <div key={index}>{renderBlock(subBlock)}</div>
          ))}
        </div>
      );
    }
    case "alert": {
      const alertColors = {
        info:
          "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600 text-blue-800 dark:text-blue-200",
        warning:
          "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200",
        error:
          "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600 text-red-800 dark:text-red-200",
        success:
          "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600 text-green-800 dark:text-green-200",
      };
      const colors = alertColors[block.level] || alertColors.info;
      const content = Array.isArray(block.content)
        ? block.content
        : [block.content];
      return (
        <div className={`${colors} border-l-4 p-6 rounded my-4`}>
          {content.map((item: string, index: number) => {
            const processedItem = item.replace(
              /\[([^\]]+)\]\(([^)]+)\)/g,
              (_match: string, text: string, url: string) => {
                const isExternal = url.startsWith("http");
                return `<a href="${url}" ${
                  isExternal ? 'target="_blank" rel="noopener noreferrer" ' : ""
                }class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">${text}</a>`;
              },
            );
            return (
              <p
                key={index}
                className={`text-sm ${index > 0 ? "mt-2" : ""}`}
                dangerouslySetInnerHTML={{ __html: processedItem }}
              />
            );
          })}
        </div>
      );
    }
    default:
      return null;
  }
}

/**
 * 渲染章节
 */
function renderSection(section: Section) {
  return (
    <section className="mb-16" key={section.title}>
      {section.title && (
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          {section.title}
        </h2>
      )}
      {section.blocks?.map((block: ContentBlock, index: number) => (
        <div key={index}>{renderBlock(block)}</div>
      ))}
    </section>
  );
}

/**
 * 文档渲染组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function DocRenderer({
  content,
}: DocRendererProps) {
  return (
    <div className="prose prose-lg max-w-none dark:prose-invert">
      {content.title && (
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          {content.title}
        </h1>
      )}
      {content.description && (
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {content.description}
        </p>
      )}
      {content.sections.map((section) =>
        renderSection(section as Section)
      )}
    </div>
  );
}

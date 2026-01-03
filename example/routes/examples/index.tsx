/**
 * 示例列表页面
 * 展示所有可用的交互示例
 */

import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "交互示例 - DWeb 框架使用示例",
  description:
    "DWeb 框架的交互示例，包括点击事件、接口请求、表单提交、状态管理等完整示例代码",
  keywords: "DWeb, 示例, 交互示例, API 路由, 表单提交, Preact Hooks, 状态管理",
  author: "DWeb",
};

export const renderMode = "csr";

/**
 * 示例列表页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function ExamplesIndexPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const examples = [
    {
      title: "点击事件",
      description: "使用 Preact 的 useState 和事件处理函数实现交互",
      path: "/examples/click-events",
      icon: "👆",
      category: "基础示例",
    },
    {
      title: "接口请求",
      description: "演示如何通过 API 路由获取、创建、更新和删除数据",
      path: "/examples/api-requests",
      icon: "🌐",
      category: "基础示例",
    },
    {
      title: "表单提交",
      description: "使用表单提交数据，通过 POST 请求创建新记录",
      path: "/examples/form-submit",
      icon: "📝",
      category: "基础示例",
    },
    {
      title: "状态管理",
      description: "使用 Store 插件进行跨组件的响应式状态管理",
      path: "/examples/store",
      icon: "🗄️",
      category: "高级示例",
    },
    {
      title: "图片上传",
      description:
        "演示如何上传图片文件到服务器，支持多文件选择、图片预览等功能",
      path: "/examples/image-upload",
      icon: "🖼️",
      category: "高级示例",
    },
  ];

  const groupedExamples = examples.reduce((acc, example) => {
    if (!acc[example.category]) {
      acc[example.category] = [];
    }
    acc[example.category].push(example);
    return acc;
  }, {} as Record<string, typeof examples>);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          欢迎来到示例中心
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          这里展示了 DWeb
          框架的各种交互功能示例，帮助你快速学习和理解框架的使用方法。
        </p>
      </div>

      {Object.entries(groupedExamples).map(([category, items]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((example) => (
              <a
                key={example.path}
                href={example.path}
                className="block p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all hover:shadow-lg group"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{example.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {example.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {example.description}
                    </p>
                    <div className="mt-4 text-green-600 dark:text-green-400 text-sm font-medium">
                      查看示例 →
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

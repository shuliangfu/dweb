/**
 * 表单提交示例页面
 * 使用表单提交数据，通过 POST 请求创建新记录
 */

import { useState } from "preact/hooks";
import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "表单提交示例 - DWeb 框架使用示例",
  description: "使用表单提交数据，通过 POST 请求创建新记录",
  keywords: "DWeb, 示例, 表单提交, POST, API 路由",
  author: "DWeb",
};

export const renderMode = "csr";

/**
 * 表单提交示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function FormSubmitPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [apiResponse, setApiResponse] = useState<
    Record<string, unknown> | null
  >(null);

  /**
   * 接口请求示例：创建示例数据（使用函数式 API - 中划线格式）
   */
  const handleCreateExample = async (e: Event) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage("请输入名称");
      return;
    }

    setLoading(true);
    setMessage("正在创建...");
    try {
      // DWeb 使用函数式 API，通过 URL 路径直接调用函数（必须使用中划线格式）
      const response = await fetch("/api/examples/create-example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        setMessage(
          `创建成功！ID: ${result.data.id}（使用中划线格式：create-example）`,
        );
        setFormData({ name: "", description: "" });
        setApiResponse(result);
      } else {
        setMessage("创建失败");
      }
    } catch (error) {
      setMessage(
        `请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const formSubmitCode = `// 表单提交示例
import { useState } from 'preact/hooks';

export default function MyForm() {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ⚠️ 重要：URL 必须使用中划线格式（kebab-case）
      const response = await fetch('/api/examples/create-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      console.log(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="名称"
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="描述"
      />
      <button type="submit" disabled={loading}>
        {loading ? '提交中...' : '提交'}
      </button>
    </form>
  );
}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          表单提交示例
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          使用表单提交数据，通过 POST 请求创建新记录。
          <strong>⚠️ 注意：</strong>API 路由 URL
          必须使用中划线格式（kebab-case）。
        </p>
      </div>

      {/* 状态消息 */}
      {message && (
        <div
          className={`p-4 rounded-xl shadow-sm border ${
            message.includes("成功") || message.includes("已")
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
              : message.includes("失败") || message.includes("错误")
              ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
          }`}
        >
          <span className="font-medium">{message}</span>
        </div>
      )}

      {/* 示例演示 */}
      <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
        <form
          className="max-w-xl mx-auto space-y-6"
          onSubmit={handleCreateExample}
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2"
            >
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: (e.target as HTMLInputElement).value,
                })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all outline-none"
              placeholder="请输入名称"
              required
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2"
            >
              描述
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: (e.target as HTMLTextAreaElement).value,
                })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all outline-none resize-none"
              placeholder="请输入描述..."
            />
          </div>
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? "处理中..." : "创建示例"}
            </button>
          </div>
        </form>
      </div>

      {/* API 响应示例 */}
      {apiResponse && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            API 响应：
          </h3>
          <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* 代码示例 */}
      <CodeBlock
        code={formSubmitCode}
        language="typescript"
        title="表单提交代码示例"
      />
    </div>
  );
}

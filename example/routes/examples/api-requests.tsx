/**
 * 接口请求示例页面
 * 演示如何通过 API 路由获取、创建、更新和删除数据
 */

import { useState, useEffect } from 'preact/hooks';
import CodeBlock from '@components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '接口请求示例 - DWeb 框架使用示例',
  description: '演示如何通过 API 路由获取、创建、更新和删除数据',
  keywords: 'DWeb, 示例, 接口请求, API 路由, fetch, POST',
  author: 'DWeb',
};

export const renderMode = 'csr';

/**
 * 接口请求示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function ApiRequestsPage({ params: _params, query: _query, data: _data }: PageProps) {
  const [examples, setExamples] = useState<Array<{ id: number; name: string; description: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [apiResponse, setApiResponse] = useState<Record<string, unknown> | null>(null);

  /**
   * 接口请求示例：获取示例数据列表（使用函数式 API - 中划线格式）
   */
  const fetchExamples = async () => {
    setLoading(true);
    setMessage('正在加载数据...');
    try {
      // DWeb 使用函数式 API，通过 URL 路径直接调用函数（必须使用中划线格式）
      const response = await fetch('/api/examples/get-examples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success) {
        setExamples(result.data);
        setMessage('数据加载成功！（使用中划线格式：get-examples）');
        setApiResponse(result);
      } else {
        setMessage('数据加载失败');
      }
    } catch (error) {
      setMessage(`请求失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 接口请求示例：删除示例数据（使用函数式 API）
   */
  const handleDeleteExample = async (id: number) => {
    if (!confirm(`确定要删除 ID 为 ${id} 的示例吗？`)) {
      return;
    }

    setLoading(true);
    setMessage('正在删除...');
    try {
      // DWeb 使用函数式 API，通过 URL 路径直接调用函数
      // ⚠️ 重要：URL 必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）
      const response = await fetch(`/api/examples/delete-example?id=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success) {
        setMessage(`删除成功！ID: ${result.deletedId}`);
        setApiResponse(result);
        // 刷新列表
        await fetchExamples();
      } else {
        setMessage('删除失败');
      }
    } catch (error) {
      setMessage(`请求失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 接口请求示例：延迟响应（演示加载状态）
   */
  const handleDelayedRequest = async () => {
    setLoading(true);
    setMessage('正在请求（延迟 2 秒）...');
    try {
      // 使用查询参数传递 delay 参数
      // ⚠️ 重要：URL 必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）
      const response = await fetch('/api/examples/delayed-response?delay=2000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success) {
        setMessage(result.message);
        setApiResponse(result);
      }
    } catch (error) {
      setMessage(`请求失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时自动加载数据
  useEffect(() => {
    fetchExamples();
  }, []);

  const fetchApiCode = `// DWeb 使用函数式 API，所有请求使用 POST 方法
// 通过 URL 路径直接调用函数，必须使用中划线格式（kebab-case）

// ⚠️ 重要：URL 必须使用中划线格式，不允许使用驼峰格式
// ✅ 正确：/api/examples/get-examples
// ❌ 错误：/api/examples/getExamples（会返回 400 错误）

// 获取数据示例
const fetchData = async () => {
  const response = await fetch('/api/examples/get-examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  console.log(result);
};

// 创建数据示例
const createData = async () => {
  const response = await fetch('/api/examples/create-example', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '示例', description: '描述' }),
  });
  const result = await response.json();
  console.log(result);
};

// 删除数据示例
const deleteData = async (id: number) => {
  const response = await fetch(\`/api/examples/delete-example?id=\${id}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  console.log(result);
};`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          接口请求示例
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          使用 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">fetch</code> API 发送请求获取数据。
          <strong>⚠️ 注意：</strong>API 路由 URL 必须使用中划线格式（kebab-case），例如 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">/api/examples/get-examples</code>，不允许使用驼峰格式（camelCase）。
        </p>
      </div>

      {/* 状态消息 */}
      {message && (
        <div className={`p-4 rounded-xl shadow-sm border ${
          message.includes('成功') || message.includes('已')
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
            : message.includes('失败') || message.includes('错误')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center">
            {loading && (
              <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}

      {/* 示例演示 */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">示例数据列表</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDelayedRequest}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                延迟请求（2秒）
              </button>
              <button
                type="button"
                onClick={fetchExamples}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    加载中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    刷新数据
                  </>
                )}
              </button>
            </div>
          </div>

          {examples.length > 0 ? (
            <div className="grid gap-4">
              {examples.map((example) => (
                <div
                  key={example.id}
                  className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group"
                >
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg mb-1">{example.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{example.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteExample(example.id)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="删除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              暂无数据，请点击上方按钮获取
            </div>
          )}
        </div>
      </div>

      {/* API 响应示例 */}
      {apiResponse && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">API 响应：</h3>
          <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* 代码示例 */}
      <CodeBlock code={fetchApiCode} language="typescript" title="接口请求代码示例（必须使用中划线格式）" />
    </div>
  );
}

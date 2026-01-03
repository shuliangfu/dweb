/**
 * 接口请求示例页面
 * 演示如何通过 API 路由获取、创建、更新和删除数据
 * 使用服务容器（Service Container）管理服务实例
 */

import { useEffect, useState } from "preact/hooks";
import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "接口请求示例 - DWeb 框架使用示例",
  description:
    "演示如何通过 API 路由获取、创建、更新和删除数据，使用服务容器管理服务",
  keywords:
    "DWeb, 示例, 接口请求, API 路由, fetch, POST, 服务容器, Service Container",
  author: "DWeb",
};

export const renderMode = "csr";

interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * 接口请求示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function ApiRequestsPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [apiResponse, setApiResponse] = useState<
    Record<string, unknown> | null
  >(null);

  /**
   * 接口请求示例：获取用户列表（使用服务容器 API）
   */
  const fetchUsers = async () => {
    setLoading(true);
    setMessage("正在加载用户数据...");
    try {
      // DWeb 使用函数式 API，通过 URL 路径直接调用函数（必须使用中划线格式）
      const response = await fetch("/api/services-example/get-users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
        setMessage(result.message || "用户数据加载成功！");
        setApiResponse(result);
      } else {
        setMessage("数据加载失败");
      }
    } catch (error) {
      setMessage(
        `请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 接口请求示例：创建用户（使用服务容器 API）
   */
  const handleCreateUser = async () => {
    const name = prompt("请输入用户名：");
    if (!name) return;

    const email = prompt("请输入邮箱：");
    if (!email) return;

    setLoading(true);
    setMessage("正在创建用户...");
    try {
      // DWeb 使用函数式 API，通过 URL 路径直接调用函数
      // ⚠️ 重要：URL 必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）
      const response = await fetch("/api/services-example/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });
      const result = await response.json();
      if (result.success) {
        setMessage(result.message || "用户创建成功！");
        setApiResponse(result);
        // 刷新列表
        await fetchUsers();
      } else {
        setMessage(result.error || "创建失败");
      }
    } catch (error) {
      setMessage(
        `请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 接口请求示例：演示服务容器的单例模式
   */
  const handleDemoSingleton = async () => {
    setLoading(true);
    setMessage("正在演示服务容器的单例模式...");
    try {
      const response = await fetch("/api/services-example/demo-singleton", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (result.success) {
        setMessage("单例模式演示完成，查看下方 API 响应了解详情");
        setApiResponse(result);
      }
    } catch (error) {
      setMessage(
        `请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 接口请求示例：演示服务之间的依赖注入
   */
  const handleDemoDependency = async () => {
    setLoading(true);
    setMessage("正在演示服务之间的依赖注入...");
    try {
      const response = await fetch("/api/services-example/demo-dependency", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (result.success) {
        setMessage(result.data.message || "依赖注入演示完成");
        setApiResponse(result);
      }
    } catch (error) {
      setMessage(
        `请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时自动加载数据
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchApiCode = `// DWeb 使用函数式 API，通过 URL 路径直接调用函数
// 必须使用中划线格式（kebab-case）

// ⚠️ 重要：URL 必须使用中划线格式，不允许使用驼峰格式
// ✅ 正确：/api/services-example/get-users
// ❌ 错误：/api/services-example/getUsers（会返回 400 错误）

// 获取用户列表（GET 请求）
const fetchUsers = async () => {
  const response = await fetch('/api/services-example/get-users', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  console.log(result);
  // 返回：{ success: true, data: [...], message: "..." }
};

// 创建用户（POST 请求）
const createUser = async (name: string, email: string) => {
  const response = await fetch('/api/services-example/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });
  const result = await response.json();
  console.log(result);
  // 返回：{ success: true, data: {...}, message: "..." }
};

// 获取单个用户（GET 请求，带查询参数）
const getUser = async (id: string) => {
  const response = await fetch(\`/api/services-example/get-user?id=\${id}\`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  console.log(result);
};

// 演示服务容器的单例模式
const demoSingleton = async () => {
  const response = await fetch('/api/services-example/demo-singleton', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  console.log(result);
  // 返回：服务容器 vs 直接 new 的对比
};

// 演示服务之间的依赖注入
const demoDependency = async () => {
  const response = await fetch('/api/services-example/demo-dependency', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  console.log(result);
  // 返回：多个服务协作的示例
};`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          接口请求示例
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
          使用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
            fetch
          </code>{" "}
          API 发送请求获取数据。
          <strong>⚠️ 注意：</strong>API 路由 URL
          必须使用中划线格式（kebab-case），例如{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
            /api/services-example/get-users
          </code>，不允许使用驼峰格式（camelCase）。
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>💡 服务容器特性：</strong>本示例使用服务容器（Service
            Container）管理服务实例。
            服务容器确保整个应用只有一个服务实例，数据在所有请求间共享，支持依赖注入和生命周期管理。
          </p>
        </div>
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
          <div className="flex items-center">
            {loading && (
              <svg
                className="animate-spin h-5 w-5 mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                >
                </circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                >
                </path>
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              用户数据列表（服务容器管理）
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleDemoSingleton}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                单例演示
              </button>
              <button
                type="button"
                onClick={handleDemoDependency}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                依赖注入
              </button>
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建用户
              </button>
              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center"
              >
                {loading
                  ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        >
                        </circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        >
                        </path>
                      </svg>
                      加载中...
                    </>
                  )
                  : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        >
                        </path>
                      </svg>
                      刷新数据
                    </>
                  )}
              </button>
            </div>
          </div>

          {users.length > 0
            ? (
              <div className="grid gap-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        ID: {user.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                暂无用户数据，请点击上方按钮创建或刷新
              </div>
            )}
        </div>
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
        code={fetchApiCode}
        language="typescript"
        title="接口请求代码示例（使用服务容器 API，必须使用中划线格式）"
      />
    </div>
  );
}

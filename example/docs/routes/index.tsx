/**
 * 首页
 * 展示应用的基本信息和快速开始指南
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Button from '../components/Button.tsx';
import type { PageProps, LoadContext } from '@dreamer/dweb';

/**
 * 加载页面数据（服务端执行）
 * @param context 包含 params、query、cookies、session 等的上下文对象
 * @returns 页面数据，会自动赋值到组件的 data 属性
 */
export const load = async ({
  params: _params,
  query: _query,
  cookies,
  session,
  getCookie,
  getSession,
}: LoadContext) => {
  // 示例：读取 Cookie
  const token = getCookie('token') || cookies.token;

  // 示例：读取 Session
  const currentSession = session || (await getSession());
  const userId = currentSession?.data?.userId;

  // 返回数据，这些数据会自动传递给页面组件的 data 属性
  return {
    message: '欢迎使用 DWeb 框架！',
    version: '1.1.1',
    token: token || null,
    userId: userId || null,
    timestamp: new Date().toISOString(),
  };
};

/**
 * 首页组件
 * @param props 页面属性，包含 params、query 和 data（load 函数返回的数据）
 * @returns JSX 元素
 */
export default function Home({ params: _params, query: _query, data }: PageProps) {
  // data 就是 load 函数返回的数据
  // 例如：data.message 就是 '欢迎使用 DWeb 框架！'
  const pageData = data as {
    message: string;
    version: string;
    token: string | null;
    userId: string | null;
    timestamp: string;
  };

  const handleClick = () => {
    alert('按钮被点击了！');
  };

  // 计数器示例（使用 Preact Hooks）
  const [count, setCount] = useState(0);
  
  const handleIncrement = () => {
    setCount(count + 1);
  };
  
  const handleDecrement = () => {
    setCount(count - 1);
  };

  // API 数据获取示例（使用 Preact Hooks）
  const [apiData, setApiData] = useState<Array<{ id: number; name: string; description: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取 API 数据
  const fetchApiData = async () => {
    // 只设置 loading 状态，不清空现有数据，避免闪动
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/getData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && result.data) {
        // 接收到新数据后再替换，避免闪动
        setApiData(result.data);
      } else {
        throw new Error(result.message || '获取数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
      console.error('API 请求错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时自动获取数据
  useEffect(() => {
    fetchApiData();
  }, []);

  // 特性列表
  const features = [
    {
      title: '文件系统路由',
      description: '基于文件系统的自动路由，只需在 routes 目录下创建文件即可',
      icon: '📁',
    },
    {
      title: '多种渲染模式',
      description: '支持 SSR、CSR 和 Hybrid 三种渲染模式，灵活选择',
      icon: '🎨',
    },
    {
      title: '热更新（HMR）',
      description: '开发时自动热更新，修改代码后立即看到效果',
      icon: '🔥',
    },
    {
      title: 'TypeScript 支持',
      description: '完整的 TypeScript 支持，提供类型安全和智能提示',
      icon: '📘',
    },
  ];

  return (
    <div className="space-y-0">
      {/* Hero 区域 */}
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {pageData.message}
          </h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto mb-2">
            基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm text-indigo-200">
              当前版本：v{pageData.version}
            </span>
          </div>
          {/* 显示 load 函数返回的数据示例 */}
          {pageData.token && (
            <p className="text-sm text-indigo-200 mb-4">
              Token: {pageData.token.substring(0, 20)}...
            </p>
          )}
          {pageData.userId && (
            <p className="text-sm text-indigo-200 mb-4">
              用户 ID: {pageData.userId}
      </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/about" variant="primary" className="bg-white text-indigo-600 hover:bg-gray-50">
              了解更多
            </Button>
            <Button onClick={handleClick} variant="primary" className="bg-white text-indigo-600 hover:bg-gray-50">
              开始使用
            </Button>
          </div>
        </div>
      </div>

      {/* 快速开始 */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">快速开始</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
              <p className="font-semibold text-blue-900 mb-4">开发指南：</p>
              <ul className="list-disc list-inside space-y-2 text-blue-800">
                <li>编辑 <code className="bg-blue-100 px-2 py-1 rounded text-sm">routes/index.tsx</code> 来修改首页</li>
                <li>在 <code className="bg-blue-100 px-2 py-1 rounded text-sm">routes/</code> 目录下创建新文件来添加路由</li>
                <li>在 <code className="bg-blue-100 px-2 py-1 rounded text-sm">components/</code> 目录下创建可复用组件</li>
                <li>在 <code className="bg-blue-100 px-2 py-1 rounded text-sm">assets/</code> 目录下放置静态资源</li>
        </ul>
            </div>
            {/* load 方法示例说明 */}
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
              <p className="font-semibold text-green-900 mb-2">load 方法示例：</p>
              <p className="text-green-800 text-sm mb-2">
                页面中的 <code className="bg-green-100 px-2 py-1 rounded text-xs">load</code> 函数在服务端执行，用于获取页面数据。
              </p>
              <p className="text-green-800 text-sm mb-2">
                load 函数返回的数据会自动传递给页面组件的 <code className="bg-green-100 px-2 py-1 rounded text-xs">data</code> 属性。
              </p>
              <p className="text-green-800 text-sm">
                当前页面数据加载时间: <code className="bg-green-100 px-2 py-1 rounded text-xs">{new Date(pageData.timestamp).toLocaleString('zh-CN')}</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 计数器示例 */}
      <div className="py-16 bg-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">交互示例</h2>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-center text-gray-600 mb-6">
              这是一个使用 Preact Hooks (useState) 实现的计数器示例
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleDecrement}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-lg"
              >
                -
              </button>
              <div className="px-8 py-4 bg-gray-100 rounded-lg min-w-[120px] text-center">
                <span className="text-3xl font-bold text-gray-900">{count}</span>
              </div>
              <button
                type="button"
                onClick={handleIncrement}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-lg"
              >
                +
              </button>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              点击 + 或 - 按钮来增加或减少计数
            </p>
          </div>
        </div>
      </div>

      {/* API 数据获取示例 */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">API 数据获取示例</h2>
          <div className="bg-gray-50 p-8 rounded-lg shadow-md">
            <p className="text-center text-gray-600 mb-6">
              这是一个使用 Preact Hooks (useState + useEffect) 获取 API 数据的示例
            </p>
            
            {/* 刷新按钮放在头部 */}
            <div className="mb-6 text-center">
              <button
                type="button"
                onClick={fetchApiData}
                disabled={loading}
                className={`px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? '刷新中...' : '刷新数据'}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                <p className="text-red-700 font-semibold">错误：</p>
                <p className="text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={fetchApiData}
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                >
                  重试
                </button>
              </div>
            )}
            
            {/* 只在初始加载且没有数据时显示加载提示 */}
            {loading && apiData.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">加载中...</p>
              </div>
            )}
            
            {/* 有数据时始终显示，刷新时不清空，避免闪动 */}
            {apiData.length > 0 && (
              <div className="space-y-4">
                {apiData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.name}</h3>
                    <p className="text-gray-600 mb-2">{item.description}</p>
                    <p className="text-sm text-gray-500">
                      创建时间: {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
                {/* 刷新时在数据列表下方显示加载提示 */}
                {loading && (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-400">正在刷新...</p>
                  </div>
                )}
              </div>
            )}
            
            {!loading && !error && apiData.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 特性展示 */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">核心特性</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

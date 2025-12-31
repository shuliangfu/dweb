/**
 * 示例页面
 * 展示各种交互示例：点击事件、接口请求、表单提交等
 * 
 * 注意：此页面使用了 Preact Hooks（useState、useEffect），
 * 必须在客户端渲染，因此设置为 CSR 模式
 */

import { useState, useEffect } from 'preact/hooks';
import CodeBlock from '../components/CodeBlock.tsx';
import Chart from '../components/Chart.tsx';
import type { PageProps } from '@dreamer/dweb';
import { exampleStore, type ExampleStoreState } from '../stores/example.ts';

export const metadata = {
  title: '交互示例 - DWeb 框架使用示例',
  description: 'DWeb 框架的交互示例，包括点击事件、接口请求（必须使用中划线格式）、表单提交、状态管理等完整示例代码',
  keywords: 'DWeb, 示例, 交互示例, API 路由, 表单提交, Preact Hooks, 状态管理',
  author: 'DWeb',
};

/**
 * 渲染模式：CSR（客户端渲染）
 * 因为使用了 Preact Hooks，必须在客户端渲染
 */
export const renderMode = 'csr';

/**
 * 示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function ExamplesPage({ params: _params, query: _query, data: _data }: PageProps) {
  // 状态管理示例
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [examples, setExamples] = useState<Array<{ id: number; name: string; description: string }>>([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [apiResponse, setApiResponse] = useState<Record<string, unknown> | null>(null);

  /**
   * 点击事件示例：增加计数器
   */
  const handleIncrement = () => {
    setCount(count + 1);
		setMessage(`计数器已增加到 ${count + 1}`);
		console.log('计数器已增加到', count + 1);
  };

  /**
   * 点击事件示例：减少计数器
   */
  const handleDecrement = () => {
    setCount(count - 1);
		setMessage(`计数器已减少到 ${count - 1}`);
		console.log('计数器已减少到', count - 1);
  };

  /**
   * 点击事件示例：重置计数器
   */
  const handleReset = () => {
    setCount(0);
    setMessage('计数器已重置');
  };

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
   * 接口请求示例：创建示例数据（使用函数式 API - 中划线格式）
   */
  const handleCreateExample = async (e: Event) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage('请输入名称');
      return;
    }

    setLoading(true);
    setMessage('正在创建...');
    try {
      // DWeb 使用函数式 API，通过 URL 路径直接调用函数（必须使用中划线格式）
      const response = await fetch('/api/examples/create-example', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        setMessage(`创建成功！ID: ${result.data.id}（使用中划线格式：create-example）`);
        setFormData({ name: '', description: '' });
        setApiResponse(result);
        // 刷新列表
        await fetchExamples();
      } else {
        setMessage('创建失败');
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

  /**
   * 接口请求示例：获取计数器值
   */
  const handleGetCounter = async () => {
    setLoading(true);
    setMessage('正在获取计数器值...');
    try {
      const response = await fetch('/api/examples/get-counter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.value !== undefined) {
        setCount(result.value);
        setMessage(`计数器值已更新为 ${result.value}`);
        setApiResponse(result);
      }
    } catch (error) {
      setMessage(`请求失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 接口请求示例：增加计数器
   */
  const handleIncrementCounter = async () => {
    setLoading(true);
    setMessage('正在增加计数器...');
    try {
      const response = await fetch('/api/examples/increment-counter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: count }),
      });
      const result = await response.json();
      if (result.success) {
        setCount(result.value);
        setMessage(`计数器已增加到 ${result.value}`);
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

  // 代码示例
  const clickEventCode = `// 点击事件示例
const [count, setCount] = useState(0);

const handleClick = () => {
  setCount(count + 1);
};

return (
  <button type="button" onClick={handleClick}>
    点击我 ({count})
  </button>
);`;

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

// 更新数据示例
const updateData = async () => {
  const response = await fetch('/api/examples/update-example', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: '123', name: '更新后的名称' }),
  });
  const result = await response.json();
  console.log(result);
};

// 删除数据示例
const deleteData = async () => {
  const response = await fetch('/api/examples/delete-example?id=123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  console.log(result);
};`;

  const formSubmitCode = `// 表单提交示例
const handleSubmit = async (e: Event) => {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);
  
  const response = await fetch('/api/examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(formData)),
  });
  
  const result = await response.json();
  console.log(result);
};`;

  // Store 状态管理
  const [storeState, setStoreState] = useState<ExampleStoreState>(exampleStore.$state);

  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = exampleStore.$subscribe((newState: ExampleStoreState) => {
      setStoreState(newState);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const storeExampleCode = `// 方式 1：对象式定义（Options API）
// stores/example.ts
import { defineStore } from '@dreamer/dweb/client';

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
}

export const exampleStore = defineStore('example', {
  state: (): ExampleStoreState => ({
    count: 0,
    message: '',
    items: [],
  }),
  actions: {
    // this 类型会自动推断，无需手动指定
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
    setMessage(message: string) {
      this.message = message;
    },
    addItem(item: string) {
      this.items = [...this.items, item];
    },
    removeItem(index: number) {
      this.items = this.items.filter((_item: string, i: number) => i !== index);
    },
  },
});

// 方式 2：函数式定义（Setup API）
// stores/example-setup.ts
import { defineStore, storeAction } from '@dreamer/dweb/client';

export const exampleStoreSetup = defineStore('example-setup', () => {
  // 定义初始状态
  const count = 0;
  const message = '';
  const items: string[] = [];
  
  // 定义 actions
  // 使用 storeAction 辅助函数可以让 this 类型自动推断
  // 与对象式定义方式一致，无需手动指定 this 类型
  const increment = storeAction<ExampleStoreState>(function() {
    this.count = (this.count || 0) + 1;
  });
  
  const decrement = storeAction<ExampleStoreState>(function() {
    this.count = (this.count || 0) - 1;
  });
  
  const setMessage = storeAction<ExampleStoreState>(function(msg: string) {
    this.message = msg;
  });
  
  const addItem = storeAction<ExampleStoreState>(function(item: string) {
    const currentItems = this.items || [];
    this.items = [...currentItems, item];
  });
  
  const removeItem = storeAction<ExampleStoreState>(function(index: number) {
    const currentItems = this.items || [];
    this.items = currentItems.filter((_item: string, i: number) => i !== index);
  });
  
  // 返回状态和 actions
  return {
    count,
    message,
    items,
    increment,
    decrement,
    setMessage,
    addItem,
    removeItem,
  };
});

// 在页面中使用（两种方式用法相同）
import { exampleStore, type ExampleStoreState } from '../stores/example.ts';
// 或
import { exampleStoreSetup } from '../stores/example-setup.ts';

export default function MyPage() {
  const [state, setState] = useState<ExampleStoreState>(exampleStore.$state);

  useEffect(() => {
    const unsubscribe = exampleStore.$subscribe((newState: ExampleStoreState) => {
      setState(newState);
    });
    return () => unsubscribe?.();
  }, []);

  return (
    <div>
      <p>Count: {exampleStore.count}</p>
      <button type="button" onClick={() => exampleStore.increment()}>+1</button>
      <button type="button" onClick={() => exampleStore.$reset()}>重置</button>
    </div>
  );
}`;

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4" onClick={() => {
            console.log('点击了标题');
          }}>交互示例</h1>
          <p className="text-xl text-blue-100 dark:text-blue-200 max-w-3xl mx-auto">
            展示 DWeb 框架中的各种交互功能：点击事件、接口请求、表单提交等
          </p>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 状态消息 */}
          {message && (
            <div className={`mb-8 p-4 rounded-lg ${
              message.includes('成功') || message.includes('已')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : message.includes('失败') || message.includes('错误')
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center">
                {loading && (
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{message}</span>
              </div>
            </div>
          )}

          {/* 1. 点击事件示例 */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">1. 点击事件示例</h2>
            <p className="text-gray-600 dark:text-gray-100 mb-6">
              使用 Preact 的 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">useState</code> 和事件处理函数实现交互。
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                >
                  减少 (-)
                </button>
                <div className="text-4xl font-bold text-gray-900 dark:text-white min-w-[100px] text-center">
                  {count}
                </div>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                >
                  增加 (+)
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  重置
                </button>
              </div>
            </div>

            <CodeBlock code={clickEventCode} language="typescript" title="点击事件代码示例" />
          </section>

          {/* 2. 接口请求示例 - GET */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">2. 接口请求示例 - GET</h2>
            <p className="text-gray-600 dark:text-gray-100 mb-6">
              使用 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">fetch</code> API 发送请求获取数据。
              <strong>⚠️ 注意：</strong>API 路由 URL 必须使用中划线格式（kebab-case），例如 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/get-examples</code>，不允许使用驼峰格式（camelCase）。
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">获取示例数据：</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={fetchExamples}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '加载中...' : '获取数据 (get-examples)'}
                    </button>
                  </div>
                </div>
              </div>

              {examples.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">示例列表：</h3>
                  <div className="space-y-2">
                    {examples.map((example) => (
                      <div
                        key={example.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{example.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-100">{example.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExample(example.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <CodeBlock code={fetchApiCode} language="typescript" title="接口请求代码示例（必须使用中划线格式）" />
          </section>

          {/* 2.5. API 格式说明 */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">2.5. API 格式说明</h2>
            <p className="text-gray-600 dark:text-gray-100 mb-6">
              DWeb 的 API 路由 <strong>必须使用中划线格式（kebab-case）</strong>，不允许使用驼峰格式（camelCase）。
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">⚠️ 格式要求</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✅ 正确：中划线格式（kebab-case）</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-100 text-sm">
                    <li><code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/get-examples</code></li>
                    <li><code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/create-example</code></li>
                    <li><code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/delete-example</code></li>
                  </ul>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-3">
                    符合 URL 规范，必须使用此格式
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">❌ 错误：驼峰格式（camelCase）</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-100 text-sm">
                    <li><code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/getExamples</code></li>
                    <li><code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/createExample</code></li>
                    <li><code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/deleteExample</code></li>
                  </ul>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-3">
                    会返回 400 错误，不允许使用
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">💡 使用说明</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-100">
                <li>代码中定义的函数名使用<strong>驼峰格式</strong>（如 <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">getExamples</code>）</li>
                <li>URL 中<strong>必须使用中划线格式</strong>（如 <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/examples/get-examples</code>）</li>
                <li>框架会自动将 URL 中的中划线格式转换为函数名的驼峰格式进行匹配</li>
                <li>如果 URL 使用驼峰格式，会返回 400 错误，并提示正确的格式</li>
              </ul>
            </div>
          </section>

          {/* 3. 表单提交示例 - POST */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">3. 表单提交示例 - POST</h2>
            <p className="text-gray-600 dark:text-gray-100 mb-6">
              使用表单提交数据，通过 POST 请求创建新记录。
              <strong>⚠️ 注意：</strong>API 路由 URL 必须使用中划线格式（kebab-case）。
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
                    名称 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
                    描述
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">提交表单：</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCreateExample}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '创建中...' : '创建示例 (create-example)'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <CodeBlock code={formSubmitCode} language="typescript" title="表单提交代码示例" />
          </section>

          {/* 4. Store 状态管理示例 */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">4. Store 状态管理示例</h2>
            <p className="text-gray-600 dark:text-gray-100 mb-6">
              使用 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">defineStore</code> 定义 store，实现跨组件的状态管理。
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-200">
                支持两种定义方式：<strong>对象式（Options API）</strong> 和 <strong>函数式（Setup API）</strong>
              </span>
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">当前状态</h3>
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-100">
                    <strong>Count:</strong> {storeState?.count ?? 0}
                  </p>
                  <p className="text-gray-700 dark:text-gray-100">
                    <strong>Message:</strong> {storeState?.message || '(空)'}
                  </p>
                  <p className="text-gray-700 dark:text-gray-100">
                    <strong>Items:</strong> {storeState?.items.length ?? 0} 项
                  </p>
                  {storeState?.items && storeState.items.length > 0 && (
                    <ul className="list-disc list-inside ml-4 text-gray-700 dark:text-gray-100">
                      {storeState.items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">操作按钮</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => exampleStore.increment()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => exampleStore.decrement()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => exampleStore.setMessage('Hello from Store!')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    设置消息
                  </button>
                  <button
                    type="button"
                    onClick={() => exampleStore.addItem(`Item ${Date.now()}`)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    添加项目
                  </button>
                  {storeState?.items && storeState.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exampleStore.removeItem(storeState.items.length - 1)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      删除最后一项
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => exampleStore.$reset()}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  重置状态
                </button>
              </div>
            </div>

            <CodeBlock code={storeExampleCode} language="typescript" title="Store 状态管理代码示例（包含对象式和函数式两种定义方式）" />
            
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📝 两种定义方式对比</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">✅ 对象式（Options API）</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-100 text-sm">
                    <li>结构清晰，易于理解</li>
                    <li>this 类型自动推断，无需手动指定</li>
                    <li>适合简单的状态管理场景</li>
                    <li>推荐用于大多数情况</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">✅ 函数式（Setup API）</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-100 text-sm">
                    <li>更灵活，可以定义局部变量和函数</li>
                    <li>适合复杂的逻辑和计算</li>
                    <li>使用 storeAction 辅助函数，this 类型自动推断</li>
                    <li>适合需要更多控制权的场景</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 5. 其他交互示例 */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">5. 其他交互示例</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* 延迟请求示例 */}
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">延迟请求示例</h3>
                <p className="text-gray-600 dark:text-gray-100 mb-4 text-sm">
                  演示如何处理异步请求的加载状态。
                </p>
                <button
                  type="button"
                  onClick={handleDelayedRequest}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {loading ? '请求中...' : '发送延迟请求（2秒）'}
                </button>
              </div>

              {/* 服务器端计数器示例 */}
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">服务器端计数器</h3>
                <p className="text-gray-600 dark:text-gray-100 mb-4 text-sm">
                  从服务器获取和更新计数器值。
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGetCounter}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? '获取中...' : '从服务器获取计数器值'}
                  </button>
                  <button
                    type="button"
                    onClick={handleIncrementCounter}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? '更新中...' : '服务器端增加计数器'}
                  </button>
                </div>
              </div>
            </div>

            {/* API 响应展示 */}
            {apiResponse && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">API 响应数据</h3>
                <div className="bg-gray-900 dark:bg-gray-950 p-6 rounded-lg border border-gray-700 dark:border-gray-800">
                  <pre className="text-sm text-gray-100 dark:text-gray-100 font-mono overflow-x-auto">
                    <code>{JSON.stringify(apiResponse, null, 2)}</code>
                  </pre>
                </div>
              </div>
            )}
          </section>

          {/* 6. 图表示例 */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">6. 图表示例（Chart.js）</h2>
            <p className="text-gray-600 dark:text-gray-100 mb-6">
              演示如何在 SSR 中使用 Chart.js 渲染图表，支持服务端渲染和客户端 hydration。
            </p>

            {/* 趋势图表 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">趋势图表（Line Chart）</h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="h-96 w-full">
                  <Chart
                    type="line"
                    config={{
                      data: {
                        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                        datasets: [
                          {
                            label: "This Week",
                            data: [120, 130, 100, 135, 90, 230, 210],
                            borderColor: "rgb(59, 130, 246)",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            fill: true,
                            tension: 0.4,
                          },
                          {
                            label: "Last Week",
                            data: [220, 185, 195, 235, 290, 325, 305],
                            borderColor: "rgb(34, 197, 94)",
                            backgroundColor: "rgba(34, 197, 94, 0.1)",
                            fill: true,
                            tension: 0.4,
                          },
                        ],
                      },
                      options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: "Weekly Trends",
                            font: { size: 18, weight: "bold" },
                          },
                          legend: { display: true, position: "top" as const },
                        },
                        scales: {
                          y: { beginAtZero: true, max: 350, ticks: { stepSize: 50 } },
                        },
                      },
                    }}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* 饼图 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">饼图（Pie Chart）</h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="h-96 w-full">
                  <Chart
                    type="pie"
                    config={{
                      data: {
                        labels: ["Desktop", "Mobile", "Tablet"],
                        datasets: [{
                          data: [60, 30, 10],
                          backgroundColor: [
                            "rgb(59, 130, 246)",
                            "rgb(34, 197, 94)",
                            "rgb(251, 146, 60)",
                          ],
                          borderWidth: 2,
                          borderColor: "#fff",
                        }],
                      },
                      options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: "Device Distribution",
                            font: { size: 18, weight: "bold" },
                          },
                          legend: { display: true, position: "right" as const },
                        },
                      },
                    }}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* 柱状图 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">柱状图（Bar Chart）</h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="h-96 w-full">
                  <Chart
                    type="bar"
                    config={{
                      data: {
                        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                        datasets: [
                          {
                            label: "Sales",
                            data: [65, 59, 80, 81, 56, 55],
                            backgroundColor: "rgba(59, 130, 246, 0.6)",
                            borderColor: "rgb(59, 130, 246)",
                            borderWidth: 2,
                          },
                          {
                            label: "Revenue",
                            data: [28, 48, 40, 19, 86, 27],
                            backgroundColor: "rgba(34, 197, 94, 0.6)",
                            borderColor: "rgb(34, 197, 94)",
                            borderWidth: 2,
                          },
                        ],
                      },
                      options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: "Monthly Sales & Revenue",
                            font: { size: 18, weight: "bold" },
                          },
                          legend: { display: true, position: "top" as const },
                        },
                        scales: { y: { beginAtZero: true } },
                      },
                    }}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">💡 使用说明</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">⚠️ 问题分析</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-100 text-sm">
                    <li>Chart.js 需要浏览器环境（window、document、Canvas API）</li>
                    <li>SSR 只能生成静态 HTML，无法执行 JavaScript</li>
                    <li>服务端和客户端渲染不一致会导致 hydration 错误</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">✅ 解决方案</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-100 text-sm">
                    <li>服务端渲染占位符（空的 canvas 元素）</li>
                    <li>客户端使用 useEffect 在组件挂载后初始化图表</li>
                    <li>使用 useRef 保存图表实例，在组件卸载时销毁</li>
                  </ol>
                </div>
              </div>
            </div>

            <CodeBlock
              code={`import Chart from '../components/Chart.tsx';

<Chart
  type="line"
  config={{
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'This Week',
        data: [120, 130, 100, 135, 90, 230, 210],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Weekly Trends' },
        legend: { display: true, position: 'top' },
      },
    }
  }}
/>`}
              language="typescript"
              title="Chart 组件使用示例"
            />
          </section>

        </div>
      </div>
    </div>
  );
}


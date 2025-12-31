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
      <div className="relative overflow-hidden bg-linear-to-r bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-24">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight" onClick={() => {
            console.log('点击了标题');
          }}>交互示例</h1>
          <p className="text-xl text-blue-100 dark:text-blue-200 max-w-3xl mx-auto leading-relaxed">
            展示 DWeb 框架中的各种交互功能：点击事件、接口请求、表单提交等
          </p>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 状态消息 */}
          {message && (
            <div className={`mb-12 p-6 rounded-2xl shadow-sm border animate-fade-in-up ${
              message.includes('成功') || message.includes('已')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
                : message.includes('失败') || message.includes('错误')
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center">
                {loading && (
                  <svg className="animate-spin h-6 w-6 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span className="font-medium text-lg">{message}</span>
              </div>
            </div>
          )}

          {/* 1. 点击事件示例 */}
          <section className="mb-20">
            <div className="flex items-center mb-8">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold mr-4 text-xl">1</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">点击事件示例</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed ml-14">
              使用 Preact 的 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">useState</code> 和事件处理函数实现交互。
            </p>
            
            <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl mb-8 shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-8 mb-8">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-16 h-16 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-all transform hover:scale-110 active:scale-95 shadow-md"
                  aria-label="减少"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                </button>
                <div className="text-6xl font-black text-gray-900 dark:text-white min-w-[120px] text-center font-mono tracking-tighter">
                  {count}
                </div>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-16 h-16 flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-all transform hover:scale-110 active:scale-95 shadow-md"
                  aria-label="增加"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm tracking-wide uppercase"
                >
                  重置计数器
                </button>
              </div>
            </div>

            <CodeBlock code={clickEventCode} language="typescript" title="点击事件代码示例" />
          </section>

          {/* 2. 接口请求示例 - GET */}
          <section className="mb-20">
            <div className="flex items-center mb-8">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold mr-4 text-xl">2</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">接口请求示例 - GET</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed ml-14">
              使用 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">fetch</code> API 发送请求获取数据。
              <strong>⚠️ 注意：</strong>API 路由 URL 必须使用中划线格式（kebab-case），例如 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">/api/examples/get-examples</code>，不允许使用驼峰格式（camelCase）。
            </p>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl mb-8 shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">示例数据列表</h3>
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

            <CodeBlock code={fetchApiCode} language="typescript" title="接口请求代码示例（必须使用中划线格式）" />
          </section>

          {/* 2.5. API 格式说明 */}
          <section className="mb-20">
            <div className="flex items-center mb-8">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold mr-4 text-xl">!</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">API 格式说明</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed ml-14">
              DWeb 的 API 路由 <strong>必须使用中划线格式（kebab-case）</strong>，不允许使用驼峰格式（camelCase）。
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-8 rounded-3xl mb-8 shadow-sm">
              <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                格式要求
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-green-900/30">
                  <h4 className="font-bold text-green-700 dark:text-green-400 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    正确：中划线格式
                  </h4>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300 text-sm font-mono">
                    <li className="flex items-center"><span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>/api/examples/get-examples</li>
                    <li className="flex items-center"><span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>/api/examples/create-example</li>
                    <li className="flex items-center"><span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>/api/examples/delete-example</li>
                  </ul>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    符合 URL 规范，SEO 友好
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
                  <h4 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    错误：驼峰格式
                  </h4>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300 text-sm font-mono">
                    <li className="flex items-center"><span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>/api/examples/getExamples</li>
                    <li className="flex items-center"><span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>/api/examples/createExample</li>
                    <li className="flex items-center"><span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>/api/examples/deleteExample</li>
                  </ul>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    会导致 400 错误
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                实现原理
              </h3>
              <ul className="space-y-2 text-blue-800 dark:text-blue-200 text-sm">
                <li className="flex items-start"><span className="mr-2">•</span>代码中定义的函数名使用驼峰格式（如 <code className="bg-white/50 dark:bg-black/20 px-1 rounded">getExamples</code>）</li>
                <li className="flex items-start"><span className="mr-2">•</span>URL 中必须使用中划线格式（如 <code className="bg-white/50 dark:bg-black/20 px-1 rounded">/api/examples/get-examples</code>）</li>
                <li className="flex items-start"><span className="mr-2">•</span>框架会自动将 URL 中的中划线格式转换为函数名的驼峰格式进行匹配</li>
              </ul>
            </div>
          </section>

          {/* 3. 表单提交示例 - POST */}
          <section className="mb-20">
            <div className="flex items-center mb-8">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold mr-4 text-xl">3</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">表单提交示例 - POST</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed ml-14">
              使用表单提交数据，通过 POST 请求创建新记录。
              <strong>⚠️ 注意：</strong>API 路由 URL 必须使用中划线格式（kebab-case）。
            </p>

            <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl mb-8 shadow-xl border border-gray-100 dark:border-gray-700">
              <form className="max-w-xl mx-auto space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                    名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all outline-none"
                    placeholder="请输入名称"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                    描述
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all outline-none resize-none"
                    placeholder="请输入描述..."
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleCreateExample}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? '处理中...' : '创建示例'}
                  </button>
                </div>
              </form>
            </div>

            <CodeBlock code={formSubmitCode} language="typescript" title="表单提交代码示例" />
          </section>

          {/* 4. Store 状态管理示例 */}
          <section className="mb-20">
            <div className="flex items-center mb-8">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold mr-4 text-xl">4</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Store 状态管理示例</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed ml-14">
              使用 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">defineStore</code> 定义 store，实现跨组件的状态管理。
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                支持两种定义方式：<strong>对象式（Options API）</strong> 和 <strong>函数式（Setup API）</strong>
              </span>
            </p>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* 状态展示 */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  当前状态
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Count</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{storeState?.count ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Message</span>
                    <span className="font-medium text-gray-900 dark:text-white">{storeState?.message || '(空)'}</span>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Items</span>
                      <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs font-bold">{storeState?.items.length ?? 0}</span>
                    </div>
                    {storeState?.items && storeState.items.length > 0 ? (
                      <ul className="space-y-1 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {storeState.items.map((item, index) => (
                          <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic">暂无项目</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                    操作控制
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => exampleStore.increment()}
                      className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-semibold"
                    >
                      +1 增加
                    </button>
                    <button
                      type="button"
                      onClick={() => exampleStore.decrement()}
                      className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-semibold"
                    >
                      -1 减少
                    </button>
                    <button
                      type="button"
                      onClick={() => exampleStore.setMessage('Hello from Store!')}
                      className="col-span-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-semibold"
                    >
                      设置消息
                    </button>
                    <button
                      type="button"
                      onClick={() => exampleStore.addItem(`Item ${Date.now()}`)}
                      className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors font-semibold"
                    >
                      添加项目
                    </button>
                    <button
                      type="button"
                      onClick={() => storeState?.items && storeState.items.length > 0 && exampleStore.removeItem(storeState.items.length - 1)}
                      disabled={!storeState?.items || storeState.items.length === 0}
                      className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      删除末项
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => exampleStore.$reset()}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
                >
                  重置所有状态
                </button>
              </div>
            </div>

            <CodeBlock code={storeExampleCode} language="typescript" title="Store 状态管理代码示例" />
            
            <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-8 rounded-3xl">
              <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-200 mb-6">📝 两种定义方式对比</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs mr-2">1</span>
                    对象式（Options API）
                  </h4>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>结构清晰，易于理解</li>
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>this 类型自动推断，无需手动指定</li>
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>适合简单的状态管理场景</li>
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>推荐用于大多数情况</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs mr-2">2</span>
                    函数式（Setup API）
                  </h4>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>更灵活，可以定义局部变量和函数</li>
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>适合复杂的逻辑和计算</li>
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>使用 storeAction 辅助函数，this 类型自动推断</li>
                    <li className="flex items-start"><svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>适合需要更多控制权的场景</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 5. 其他交互示例 */}
          <section className="mb-20">
            <div className="flex items-center mb-8">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold mr-4 text-xl">5</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">其他交互示例</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* 延迟请求示例 */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">延迟请求示例</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    演示如何处理异步请求的加载状态，模拟网络延迟。
                  </p>
                </div>
                <div className="mt-auto">
                  <button
                    type="button"
                    onClick={handleDelayedRequest}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
                  >
                    {loading ? '请求处理中...' : '发送延迟请求（2秒）'}
                  </button>
                </div>
              </div>

              {/* 服务器端计数器示例 */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">服务器端计数器</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    从服务器获取和更新计数器值，数据持久化在服务端。
                  </p>
                </div>
                <div className="space-y-3 mt-auto">
                  <button
                    type="button"
                    onClick={handleGetCounter}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? '获取中...' : '从服务器获取值'}
                  </button>
                  <button
                    type="button"
                    onClick={handleIncrementCounter}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? '更新中...' : '服务端 +1'}
                  </button>
                </div>
              </div>
            </div>

            {/* API 响应展示 */}
            {apiResponse && (
              <div className="mt-8 animate-fade-in-up">
                <div className="bg-gray-900 dark:bg-black rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between px-6 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-gray-300">API 响应数据</h3>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="p-6 overflow-x-auto">
                    <pre className="text-sm text-green-400 font-mono">
                      <code>{JSON.stringify(apiResponse, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 6. 图表示例 */}
          <section className="mb-20">
            <div className="flex items-center mb-8">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold mr-4 text-xl">6</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">图表示例（Chart.js）</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed ml-14">
              演示如何在 SSR 中使用 Chart.js 渲染图表，支持服务端渲染和客户端 hydration。
            </p>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* 趋势图表 */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 pl-2 border-l-4 border-blue-500">趋势图表</h3>
                <div className="h-80 w-full">
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

              {/* 饼图 */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 pl-2 border-l-4 border-green-500">分布占比</h3>
                <div className="h-80 w-full flex justify-center">
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
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 mb-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 pl-2 border-l-4 border-purple-500">月度统计</h3>
              <div className="h-96 w-full">
                <Chart
                  type="bar"
                  config={{
                    data: {
                      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                      datasets: [
                        {
                          label: "Sales",
                          data: [65, 59, 80, 81, 56, 55, 40, 60, 70, 90, 100, 110],
                          backgroundColor: "rgba(59, 130, 246, 0.8)",
                          borderRadius: 4,
                        },
                        {
                          label: "Revenue",
                          data: [28, 48, 40, 19, 86, 27, 50, 70, 60, 80, 90, 100],
                          backgroundColor: "rgba(168, 85, 247, 0.8)",
                          borderRadius: 4,
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: true, position: "top" as const },
                      },
                      scales: { y: { beginAtZero: true } },
                    },
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* 使用说明 */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                SSR 图表渲染说明
              </h3>
              <div className="grid md:grid-cols-2 gap-8 mb-6">
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">⚠️ 常见问题</h4>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                    <li className="flex items-start"><span className="text-red-500 mr-2">×</span>Chart.js 依赖 window/document 对象</li>
                    <li className="flex items-start"><span className="text-red-500 mr-2">×</span>SSR 无法执行 Canvas 绘图操作</li>
                    <li className="flex items-start"><span className="text-red-500 mr-2">×</span>直接渲染会导致 hydration 不匹配错误</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">✅ DWeb 解决方案</h4>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                    <li className="flex items-start"><span className="text-green-500 mr-2">√</span>服务端渲染透明占位符</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">√</span>客户端组件挂载后初始化图表</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">√</span>自动处理实例销毁和内存管理</li>
                  </ul>
                </div>
              </div>
              
              <CodeBlock
                code={`import Chart from '../components/Chart.tsx';

<Chart
  type="line"
  config={{
    data: { ... },
    options: { ... }
  }}
  className="w-full h-full"
/>`}
                language="typescript"
                title="组件使用示例"
              />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}


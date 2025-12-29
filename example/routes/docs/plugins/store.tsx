/**
 * 插件 - store 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "store 插件 - DWeb 框架文档",
  description: "store 插件使用指南 - 客户端状态管理",
};

export default function StorePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const basicUsageCode = `import { store } from '@dreamer/dweb';

// 方式1：手动配置 initialState（传统方式）
app.plugin(
  store({
    persist: true,              // 是否启用持久化（默认 false）
    storageKey: 'dweb-store',   // 持久化存储键名（默认 'dweb-store'）
    enableServer: true,         // 是否在服务端启用（默认 true）
    initialState: {             // 初始状态
      count: 0,
      user: null,
    },
  })
);

// 方式2：自动收集（推荐，使用 defineStore）
// 只需导入 stores 文件，store 插件会自动收集初始状态

app.plugin(
  store({
    persist: true,
    storageKey: 'dweb-store',
    // 不需要手动配置 initialState，会自动从已注册的 stores 中收集
  })
);`;

  const clientUsageCode = `import { 
  getStore, 
  getStoreState, 
  setStoreState, 
  subscribeStore,
  resetStore 
} from '@dreamer/dweb/client';

// 方式1：获取 Store 实例（适用于需要多次操作）
const store = getStore();
if (store) {
  const state = store.getState();        // 获取状态
  store.setState({ count: 1 });          // 更新状态
  const unsubscribe = store.subscribe((state) => {
    console.log('状态变化:', state);
  });
  store.reset();                         // 重置状态
}

// 方式2：直接获取状态值（更简洁，适用于只读取一次）
const state = getStoreState<{ count: number }>();
if (state) {
  console.log(state.count);
}

// 方式3：更新状态
setStoreState({ count: 1 });
// 或使用函数式更新
setStoreState((prev) => ({ count: prev.count + 1 }));

// 方式4：订阅状态变化
const unsubscribe = subscribeStore((state) => {
  console.log('状态变化:', state);
});
// 取消订阅
if (unsubscribe) {
  unsubscribe();
}

// 方式5：重置状态
resetStore();`;

  const defineStoreCode = `// 方式 1：对象式定义（Options API）
// stores/example.ts
import { defineStore } from '@dreamer/dweb/client';

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
}

// 定义 Store（声明式 API）
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
import { defineStore } from '@dreamer/dweb/client';

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
}

export const exampleStoreSetup = defineStore('example-setup', ({ storeAction }) => {
  // 定义初始状态
  const count: number = 0;
  const message: string = '';
  const items: string[] = [];
  
  // 定义 actions
  // 使用 storeAction 辅助函数，需要手动指定状态类型参数
  // 这样可以让 this 类型正确推断，无需手动指定 this 类型，也无需 @ts-expect-error 注释
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
});`;

  const defineStoreUsageCode = `// 在组件中使用 defineStore 定义的 store
import { useEffect, useState } from 'preact/hooks';
import { exampleStore, type ExampleStoreState } from '../stores/example.ts';

export default function ExampleStorePage() {
  // exampleStore 是 store 实例，直接使用
  const [state, setState] = useState<ExampleStoreState>(exampleStore.$state);

  useEffect(() => {
    // 订阅状态变化
    // $subscribe 会立即调用一次，传递当前状态
    const unsubscribe = exampleStore.$subscribe((newState: ExampleStoreState) => {
      setState(newState);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <div>
      <p>Count: {exampleStore.count}</p>
      <p>Message: {exampleStore.message}</p>
      <button onClick={() => exampleStore.increment()}>+1</button>
      <button onClick={() => exampleStore.decrement()}>-1</button>
      <button onClick={() => exampleStore.setMessage('Hello!')}>设置消息</button>
      <button onClick={() => exampleStore.$reset()}>重置</button>
    </div>
  );
}`;

  const reactExampleCode = `import { useEffect, useState } from 'preact/hooks';
import { getStoreState, setStoreState, subscribeStore } from '@dreamer/dweb/client';

interface NavState {
  currentPath: string;
  navOpen: boolean;
}

export default function Navbar() {
  const [state, setState] = useState<NavState | null>(null);

  useEffect(() => {
    // 初始化状态
    const initialState = getStoreState<NavState>();
    setState(initialState);

    // 订阅状态变化
    const unsubscribe = subscribeStore<NavState>((newState) => {
      setState(newState);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const toggleNav = () => {
    setStoreState<NavState>((prev) => ({
      ...prev,
      navOpen: !prev?.navOpen,
    }));
  };

  return (
    <nav>
      <button onClick={toggleNav}>
        {state?.navOpen ? '关闭' : '打开'}
      </button>
    </nav>
  );
}`;

  const apiReferenceCode = `// ===== defineStore API（推荐） =====
function defineStore<T extends StoreState>(
  name: string,
  options: StoreOptions<T>
): StoreInstance<T> & T

// Store 实例方法
interface StoreInstance<T> {
  $name: string;              // Store 名称
  $state: T;                  // 获取完整状态
  $reset: () => void;         // 重置状态
  $subscribe: (listener: (state: T) => void) => (() => void) | null;
}

// ===== 传统 API =====
// 获取 Store 实例
function getStore(): Store | null

// 获取当前状态值
function getStoreState<T = Record<string, unknown>>(): T | null

// 设置状态
function setStoreState<T>(
  updater: Partial<T> | ((prev: T) => Partial<T>)
): void

// 订阅状态变化
function subscribeStore<T>(
  listener: (state: T) => void
): (() => void) | null

// 重置状态到初始值
function resetStore(): void`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        store - 状态管理插件
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        store
        插件提供客户端状态管理功能，支持响应式状态更新、持久化存储和跨组件状态共享。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          技术亮点
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>同构架构 (Isomorphic Architecture)</strong>： 支持服务端渲染
            (SSR) 和客户端激活 (Hydration)。服务端为每个请求创建独立的 Store
            实例，防止跨请求状态污染；客户端通过 onResponse
            钩子自动获取服务端状态，实现无缝接管。
          </li>
          <li>
            <strong>即时编译 (JIT Compilation)</strong>： 利用 esbuild
            在运行时即时编译和压缩客户端脚本 (browser.ts)，并支持从 JSR
            包中远程加载代码，无需复杂的构建配置。
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            dweb.config.ts
          </code>{" "}
          或{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            main.ts
          </code>{" "}
          中配置 store 插件：
        </p>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          客户端 API
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在客户端组件中使用 store（从{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            @dreamer/dweb/client
          </code>{" "}
          导入）：
        </p>
        <CodeBlock code={clientUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          defineStore API（推荐，声明式 API）
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            defineStore
          </code>{" "}
          提供了声明式的 API，让 store 的定义和使用更加简洁和类型安全。
          <br />
          <span className="text-sm text-gray-500">
            支持两种定义方式：<strong>对象式（Options API）</strong> 和{" "}
            <strong>函数式（Setup API）</strong>
          </span>
        </p>
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            定义 Store
          </h3>
          <CodeBlock
            code={defineStoreCode}
            language="typescript"
            title="defineStore 定义示例（包含对象式和函数式两种方式）"
          />

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              📝 两种定义方式对比
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-semibold text-gray-800 mb-2">
                  ✅ 对象式（Options API）
                </h5>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>结构清晰，易于理解</li>
                  <li>this 类型自动推断，无需手动指定</li>
                  <li>适合简单的状态管理场景</li>
                  <li>推荐用于大多数情况</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-gray-800 mb-2">
                  ✅ 函数式（Setup API）
                </h5>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>更灵活，可以定义局部变量和函数</li>
                  <li>适合复杂的逻辑和计算</li>
                  <li>
                    使用 storeAction 辅助函数，需指定类型参数，this 类型自动推断
                  </li>
                  <li>适合需要更多控制权的场景</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            在组件中使用
          </h3>
          <CodeBlock code={defineStoreUsageCode} language="typescript" />
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <p className="text-blue-800">
            <strong>💡 提示：</strong>使用{" "}
            <code className="bg-blue-100 px-2 py-1 rounded">defineStore</code>
            {" "}
            时，store 插件会自动收集所有已定义的 store 的初始状态，无需手动配置
            {" "}
            <code className="bg-blue-100 px-2 py-1 rounded">
              initialState
            </code>。只需在{" "}
            <code className="bg-blue-100 px-2 py-1 rounded">main.ts</code>{" "}
            中导入 stores 文件即可。
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          传统 API 使用示例
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          如果不使用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            defineStore
          </code>，也可以使用传统的 API 方式：
        </p>
        <CodeBlock code={reactExampleCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              persist
            </code>{" "}
            - 是否启用持久化（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              false
            </code>）。启用后，状态会保存到{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              localStorage
            </code>
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              storageKey
            </code>{" "}
            - 持久化存储键名（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'dweb-store'
            </code>）
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              enableServer
            </code>{" "}
            - 是否在服务端启用（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              true
            </code>）
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              initialState
            </code>{" "}
            - 初始状态对象（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              {}
            </code>）
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>
        <CodeBlock code={apiReferenceCode} language="typescript" />
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getStore()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              获取 Store 实例。返回{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                Store | null
              </code>。 适用于需要多次操作 Store 的场景。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getStoreState()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              直接获取当前状态值。返回{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                T | null
              </code>。 适用于只需要读取一次状态的场景，更简洁。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                setStoreState()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              更新状态。接受部分状态对象或更新函数。会自动触发所有订阅者。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                subscribeStore()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              订阅状态变化。返回取消订阅函数。监听器会在状态变化时自动调用。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                resetStore()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              重置状态到初始值。会清除持久化存储（如果启用）并触发所有订阅者。
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          特性
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <strong>响应式更新：</strong>状态变化时自动通知所有订阅者
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>持久化存储：</strong>支持将状态保存到{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              localStorage
            </code>
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>类型安全：</strong>完整的 TypeScript 类型支持，自动推断
            actions 类型
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>跨组件共享：</strong>状态可以在任意组件间共享
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>服务端支持：</strong>支持服务端状态初始化
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>声明式 API：</strong>提供{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defineStore
            </code>{" "}
            API，使用简洁直观
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>自动收集：</strong>使用{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defineStore
            </code>{" "}
            时，初始状态会自动收集，无需手动配置
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          注意事项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            所有客户端 API 函数在服务端渲染时返回{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              null
            </code>，不会报错
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            状态更新是同步的，会立即触发所有订阅者
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            持久化存储使用{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              localStorage
            </code>，仅在浏览器环境中可用
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            建议在组件卸载时取消订阅，避免内存泄漏
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            客户端 API 需要从{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              @dreamer/dweb/client
            </code>{" "}
            导入，而不是从{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              @dreamer/dweb
            </code>
          </li>
        </ul>
      </section>
    </article>
  );
}

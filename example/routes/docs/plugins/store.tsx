/**
 * 插件 - store 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "store 插件 - DWeb 框架文档",
  description: "store 插件使用指南 - 客户端状态管理",
};

export default function StorePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const basicUsageCode = `import { store } from '@dreamer/dweb/plugins';

plugins: [
  store({
    persist: true,              // 是否启用持久化（默认 false）
    storageKey: 'dweb-store',   // 持久化存储键名（默认 'dweb-store'）
    enableServer: true,         // 是否在服务端启用（默认 true）
    initialState: {             // 初始状态
      count: 0,
      user: null,
    },
  }),
],`;

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

  const apiReferenceCode = `// 获取 Store 实例
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
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        store - 状态管理插件
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        store 插件提供客户端状态管理功能，支持响应式状态更新、持久化存储和跨组件状态共享。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          基本使用
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code> 或 <code className="bg-gray-100 px-2 py-1 rounded">main.ts</code> 中配置 store 插件：
        </p>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          客户端 API
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在客户端组件中使用 store（从 <code className="bg-gray-100 px-2 py-1 rounded">@dreamer/dweb/client</code> 导入）：
        </p>
        <CodeBlock code={clientUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          React/Preact 组件示例
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在 Preact/React 组件中使用 store 的完整示例：
        </p>
        <CodeBlock code={reactExampleCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">persist</code>{" "}
            - 是否启用持久化（默认 <code className="bg-gray-100 px-2 py-1 rounded">false</code>）。启用后，状态会保存到 <code className="bg-gray-100 px-2 py-1 rounded">localStorage</code>
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">storageKey</code>{" "}
            - 持久化存储键名（默认 <code className="bg-gray-100 px-2 py-1 rounded">'dweb-store'</code>）
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">enableServer</code>{" "}
            - 是否在服务端启用（默认 <code className="bg-gray-100 px-2 py-1 rounded">true</code>）
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">initialState</code>{" "}
            - 初始状态对象（默认 <code className="bg-gray-100 px-2 py-1 rounded">{}</code>）
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          API 参考
        </h2>
        <CodeBlock code={apiReferenceCode} language="typescript" />
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">getStore()</code>
            </h3>
            <p className="text-gray-700">
              获取 Store 实例。返回 <code className="bg-gray-100 px-2 py-1 rounded">Store | null</code>。
              适用于需要多次操作 Store 的场景。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">getStoreState()</code>
            </h3>
            <p className="text-gray-700">
              直接获取当前状态值。返回 <code className="bg-gray-100 px-2 py-1 rounded">T | null</code>。
              适用于只需要读取一次状态的场景，更简洁。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">setStoreState()</code>
            </h3>
            <p className="text-gray-700">
              更新状态。接受部分状态对象或更新函数。会自动触发所有订阅者。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">subscribeStore()</code>
            </h3>
            <p className="text-gray-700">
              订阅状态变化。返回取消订阅函数。监听器会在状态变化时自动调用。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">resetStore()</code>
            </h3>
            <p className="text-gray-700">
              重置状态到初始值。会清除持久化存储（如果启用）并触发所有订阅者。
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          特性
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <strong>响应式更新：</strong>状态变化时自动通知所有订阅者
          </li>
          <li className="text-gray-700">
            <strong>持久化存储：</strong>支持将状态保存到 <code className="bg-gray-100 px-2 py-1 rounded">localStorage</code>
          </li>
          <li className="text-gray-700">
            <strong>类型安全：</strong>完整的 TypeScript 类型支持
          </li>
          <li className="text-gray-700">
            <strong>跨组件共享：</strong>状态可以在任意组件间共享
          </li>
          <li className="text-gray-700">
            <strong>服务端支持：</strong>支持服务端状态初始化
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          注意事项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            所有客户端 API 函数在服务端渲染时返回 <code className="bg-gray-100 px-2 py-1 rounded">null</code>，不会报错
          </li>
          <li className="text-gray-700">
            状态更新是同步的，会立即触发所有订阅者
          </li>
          <li className="text-gray-700">
            持久化存储使用 <code className="bg-gray-100 px-2 py-1 rounded">localStorage</code>，仅在浏览器环境中可用
          </li>
          <li className="text-gray-700">
            建议在组件卸载时取消订阅，避免内存泄漏
          </li>
          <li className="text-gray-700">
            客户端 API 需要从 <code className="bg-gray-100 px-2 py-1 rounded">@dreamer/dweb/client</code> 导入，而不是从 <code className="bg-gray-100 px-2 py-1 rounded">@dreamer/dweb</code>
          </li>
        </ul>
      </section>
    </article>
  );
}


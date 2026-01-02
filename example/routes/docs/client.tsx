/**
 * 客户端 API 文档页面
 * 展示 DWeb 框架的客户端 API 和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "客户端 API - DWeb 框架文档",
  description:
    "DWeb 框架的客户端 API，提供状态管理、主题切换、国际化、路由导航等功能",
};

export default function ClientPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 快速开始
  const quickStartCode = `import { 
  route, 
  getCurrentPath, 
  useThemeStore,
  translate,
  useStore 
} from "@dreamer/dweb/client";
import { counterStore } from "../stores/counter.ts";

// 在组件中使用
export default function MyPage() {
  const theme = useThemeStore();
  const counter = useStore(counterStore);
  
  const handleNavigate = () => {
    route({ path: "/docs", params: { page: 1 } });
  };
  
  return (
    <div>
      <h1>{translate("page.title")}</h1>
      <p>当前主题: {theme.value}</p>
      <p>计数: {counter.count}</p>
      <button onClick={handleNavigate}>跳转</button>
    </div>
  );
}`;

  // Store 状态管理
  const storeCode = `import { 
  getStore, 
  getStoreState, 
  setStoreState,
  subscribeStore,
  useStore 
} from "@dreamer/dweb/client";
import { counterStore } from "../stores/counter.ts";

// 获取 Store 实例
const store = getStore();

// 获取状态
const state = getStoreState<AppState>();

// 更新状态
setStoreState({ count: 10 });
setStoreState((prev) => ({ ...prev, count: prev.count + 1 }));

// 订阅状态变化
const unsubscribe = subscribeStore((state) => {
  console.log("状态已更新:", state);
});

// 在组件中使用（响应式）
const counter = useStore(counterStore);
console.log(counter.count);`;

  // defineStore 示例
  const defineStoreCode = `import { defineStore } from "@dreamer/dweb/client";

// 定义 Store
export const counterStore = defineStore("counter", {
  state: () => ({
    count: 0,
    message: "",
  }),
  actions: {
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
  },
});

// 使用
counterStore.increment();
console.log(counterStore.count);

// 在组件中使用（响应式）
import { useStore } from "@dreamer/dweb/client";
const counter = useStore(counterStore);`;

  // 主题管理
  const themeCode = `import { 
  getTheme, 
  setTheme, 
  toggleTheme,
  useThemeStore,
  subscribeTheme 
} from "@dreamer/dweb/client";

// 获取当前主题
const theme = getTheme(); // 'light' | 'dark' | 'auto'

// 设置主题
setTheme("dark");

// 切换主题
toggleTheme();

// 在组件中使用（响应式）
const theme = useThemeStore();
console.log(theme.value); // 'light' | 'dark'
console.log(theme.mode); // 'light' | 'dark' | 'auto'

// 订阅主题变化
subscribeTheme((theme) => {
  console.log("主题已切换为:", theme);
});`;

  // 国际化
  const i18nCode = `import { 
  translate, 
  getCurrentLanguage,
  setCurrentLanguage 
} from "@dreamer/dweb/client";

// 翻译文本
const title = translate("common.title");
const welcome = translate("common.welcome", { name: "John" });

// 获取当前语言
const lang = getCurrentLanguage(); // 'zh-CN' | 'en-US'

// 切换语言
await setCurrentLanguage("en-US");`;

  // 路由工具
  const routeCode = `import { 
  route, 
  getCurrentPath, 
  getQueryParams,
  getCurrentUrl 
} from "@dreamer/dweb/client";

// 基本导航
route("/docs");

// 带查询参数（字符串形式）
route("/docs?page=1&sort=name");

// 使用对象形式传递参数
route({ 
  path: "/docs", 
  params: { page: 1, sort: "name" } 
});

// 替换当前历史记录
route("/docs", true);

// 获取当前路径
const path = getCurrentPath(); // '/docs'

// 获取查询参数
const params = getQueryParams(); // { page: "1", sort: "name" }

// 获取完整 URL
const url = getCurrentUrl(); // 'https://example.com/docs?page=1'`;

  // React/Preact 组件示例
  const reactExampleCode = `import { useEffect, useState } from 'preact/hooks';
import { 
  route, 
  getCurrentPath,
  useThemeStore,
  translate,
  useStore 
} from '@dreamer/dweb/client';
import { counterStore } from '../stores/counter.ts';

export default function ExamplePage() {
  const theme = useThemeStore();
  const counter = useStore(counterStore);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(getCurrentPath());
  }, []);

  const handleNavigate = () => {
    route({ path: '/docs', params: { page: 1 } });
  };

  return (
    <div>
      <h1>{translate('page.title')}</h1>
      <p>当前主题: {theme.value}</p>
      <p>当前路径: {currentPath}</p>
      <p>计数: {counter.count}</p>
      <button onClick={handleNavigate}>跳转到文档</button>
      <button onClick={() => counter.increment()}>增加计数</button>
    </div>
  );
}`;

  // API 参考
  const apiReferenceCode = `// ===== 通用常量 =====
const IS_CLIENT: boolean
const IS_SERVER: boolean

// ===== Store 状态管理 =====
function getStore(): Store | null
function getStoreState<T>(): T | null
function setStoreState<T>(updater: Partial<T> | ((prev: T) => Partial<T>)): void
function subscribeStore<T>(listener: (state: T) => void): (() => void) | null
function resetStore(): void
function defineStore<T>(name: string, options: StoreOptions<T>): StoreInstance<T> & T
function useStore<T>(store: StoreInstance<T>): StoreInstance<T> & T

// ===== 主题管理 =====
function getTheme(): 'light' | 'dark' | 'auto' | null
function getActualTheme(): 'light' | 'dark' | null
function setTheme(theme: 'light' | 'dark' | 'auto'): void
function toggleTheme(): 'dark' | 'light' | null
function switchTheme(theme: 'light' | 'dark' | 'auto'): 'light' | 'dark' | 'auto' | null
function subscribeTheme(listener: (theme: 'light' | 'dark') => void): (() => void) | null
function useThemeStore(): ThemeStoreInstance & ThemeStoreState

// ===== 国际化 (i18n) =====
function translate(key: string, params?: Record<string, any>): string
function getCurrentLanguage(): string | null
function setCurrentLanguage(langCode: string): Promise<void>
function getTranslations(): Record<string, unknown> | null
function isI18nInitialized(): boolean

// ===== 路由工具 =====
function route(
  path: string | { path: string; params?: Record<string, string | number | boolean> },
  replace?: boolean
): boolean
function getCurrentPath(): string
function getQueryParams(): Record<string, string>
function getCurrentUrl(): string`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        客户端 API
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        DWeb 框架提供了丰富的客户端 API，用于在浏览器环境中进行状态管理、主题切换、国际化、路由导航等操作。
        所有客户端 API 都从{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          @dreamer/dweb/client
        </code>{" "}
        模块导出。
      </p>

      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 my-6 rounded">
        <p className="text-blue-800 dark:text-blue-200 m-0">
          <strong>注意：</strong>所有客户端 API 在服务端环境中会返回{" "}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-blue-900 dark:text-blue-100">
            null
          </code>{" "}
          或执行空操作，这是正常行为。
        </p>
      </div>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在组件中导入并使用客户端 API：
        </p>
        <CodeBlock code={quickStartCode} language="tsx" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          Store 状态管理
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          DWeb 框架提供了完整的状态管理解决方案，支持全局状态管理和响应式更新。
        </p>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本 API
        </h3>
        <CodeBlock code={storeCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          defineStore - 声明式定义 Store
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          使用 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">defineStore</code>{" "}
          可以声明式地定义 Store，支持 Options API 和 Setup API 两种方式。
        </p>
        <CodeBlock code={defineStoreCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          主题管理
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          DWeb 框架内置了主题切换功能，支持浅色、深色和自动（跟随系统）三种模式。
        </p>
        <CodeBlock code={themeCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          国际化 (i18n)
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          DWeb 框架提供了完整的国际化支持，支持多语言切换和动态翻译。
        </p>
        <CodeBlock code={i18nCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          路由工具
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          DWeb 框架提供了路由导航工具函数，支持 SPA 无刷新导航和参数传递。
        </p>
        <CodeBlock code={routeCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          React/Preact 组件示例
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在 Preact/React 组件中使用客户端 API 的完整示例：
        </p>
        <CodeBlock code={reactExampleCode} language="tsx" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>
        <CodeBlock code={apiReferenceCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          注意事项
        </h2>
        <ol className="list-decimal list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>客户端环境检查</strong>：所有客户端 API 在服务端环境中会返回{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              null
            </code>{" "}
            或执行空操作，这是正常行为。
          </li>
          <li>
            <strong>类型安全</strong>：使用 TypeScript 时，建议为 Store 状态定义明确的类型，以获得更好的类型提示。
          </li>
          <li>
            <strong>响应式更新</strong>：使用 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">useStore</code>{" "}
            和 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">useThemeStore</code>{" "}
            Hook 时，状态变化会自动触发组件重新渲染。
          </li>
          <li>
            <strong>路由导航</strong>：<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">route</code>{" "}
            函数优先使用框架的 SPA 导航，如果不可用会回退到整页跳转。
          </li>
          <li>
            <strong>i18n 初始化</strong>：使用 i18n 相关 API 前，确保 i18n 插件已正确初始化。
          </li>
        </ol>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/plugins/store"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Store 插件文档
            </a>
          </li>
          <li>
            <a
              href="/docs/plugins/theme"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              主题插件文档
            </a>
          </li>
          <li>
            <a
              href="/docs/plugins/i18n"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              i18n 插件文档
            </a>
          </li>
          <li>
            <a
              href="/docs/routing-conventions"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              路由约定文档
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

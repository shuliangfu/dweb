/**
 * 插件 - theme 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "theme 插件 - DWeb 框架文档",
  description: "theme 插件使用指南 - 主题切换功能",
};

export default function ThemePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const basicUsageCode = `import { theme } from '@dreamer/dweb/plugins';

plugins: [
  theme({
    defaultTheme: 'light',     // 'light' | 'dark' | 'auto'
    storageKey: 'theme',        // localStorage 存储键名
    transition: true,           // 是否启用主题切换过渡动画
    injectDataAttribute: true, // 是否在 HTML 上添加 data-theme 属性
    injectBodyClass: true,      // 是否添加类名到 body
  }),
],`;

  const clientUsageCode = `import { 
  getTheme, 
  getActualTheme, 
  setTheme, 
  toggleTheme,
  switchTheme,
  subscribeTheme,
  getThemeValue
} from '@dreamer/dweb/client';

// 获取当前主题
const theme = getTheme(); // 'light' | 'dark' | 'auto' | null

// 获取实际主题（处理 auto 模式）
const actualTheme = getActualTheme(); // 'light' | 'dark' | null

// 设置主题
setTheme('dark');
setTheme('light');
setTheme('auto'); // 自动跟随系统主题

// 切换主题（在 dark 和 light 之间切换）
const newTheme = toggleTheme(); // 'dark' | 'light' | null

// 切换到指定主题
const switchedTheme = switchTheme('dark'); // 'light' | 'dark' | 'auto' | null

// 订阅主题变化
const unsubscribe = subscribeTheme((actualTheme) => {
  console.log('主题变化:', actualTheme); // 'light' | 'dark'
});
// 取消订阅
if (unsubscribe) {
  unsubscribe();
}

// 获取当前主题值（从 Store 中获取）
const currentValue = getThemeValue(); // 'light' | 'dark' | null`;

  const reactExampleCode = `import { useEffect, useState } from 'preact/hooks';
import { getActualTheme, toggleTheme, subscribeTheme } from '@dreamer/dweb/client';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // 初始化主题
    const initialTheme = getActualTheme();
    setTheme(initialTheme);

    // 订阅主题变化
    const unsubscribe = subscribeTheme((newTheme) => {
      setTheme(newTheme);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <button onClick={handleToggle}>
      当前主题: {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}`;

  const apiReferenceCode = `// 获取主题管理器实例
function getThemeManager(): ThemeManager | null

// 获取主题 Store 实例
function getThemeStore(): ThemeStore | null

// 获取当前主题
function getTheme(): 'light' | 'dark' | 'auto' | null

// 获取实际主题（处理 auto 模式）
function getActualTheme(): 'light' | 'dark' | null

// 设置主题
function setTheme(theme: 'light' | 'dark' | 'auto'): void

// 切换主题（在 dark 和 light 之间切换）
function toggleTheme(): 'dark' | 'light' | null

// 切换到指定主题
function switchTheme(theme: 'light' | 'dark' | 'auto'): 'light' | 'dark' | 'auto' | null

// 订阅主题变化
function subscribeTheme(
  listener: (theme: 'light' | 'dark') => void
): (() => void) | null

// 获取当前主题值（从 Store 中获取）
function getThemeValue(): 'light' | 'dark' | null`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        theme - 主题插件
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        theme
        插件提供主题切换功能，支持亮色、暗色和自动模式（跟随系统主题）。插件会自动在
        HTML 元素上添加相应的 class，方便与 Tailwind CSS 的 dark mode 配合使用。
      </p>

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
          中配置 theme 插件：
        </p>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          客户端 API
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在客户端组件中使用主题功能（从{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            @dreamer/dweb/client
          </code>{" "}
          导入）：
        </p>
        <CodeBlock code={clientUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          React/Preact 组件示例
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在 Preact/React 组件中使用主题切换的完整示例：
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
              defaultTheme
            </code>{" "}
            -
            默认主题（<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'light'
            </code>{" "}
            |{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'dark'
            </code>{" "}
            |{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'auto'
            </code>），默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'auto'
            </code>
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              storageKey
            </code>{" "}
            - localStorage 存储键名（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'theme'
            </code>）
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              transition
            </code>{" "}
            - 是否启用主题切换过渡动画（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              true
            </code>）
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              injectDataAttribute
            </code>{" "}
            - 是否在 HTML 元素上添加{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              data-theme
            </code>{" "}
            属性（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              true
            </code>）
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              injectBodyClass
            </code>{" "}
            - 是否在 body 元素上添加主题类名（默认{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              true
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
                getTheme()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              获取当前主题设置。返回{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'light' | 'dark' | 'auto' | null
              </code>。 如果设置为{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'auto'
              </code>，会跟随系统主题。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getActualTheme()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              获取实际主题（处理 auto 模式）。返回{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'light' | 'dark' | null
              </code>。 如果主题设置为{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'auto'
              </code>，会返回当前系统主题。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                setTheme()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              设置主题。接受{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'light'
              </code>、<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'dark'
              </code>{" "}
              或{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'auto'
              </code>。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                toggleTheme()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              切换主题（在 dark 和 light 之间切换）。返回切换后的主题。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                switchTheme()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              切换到指定主题。返回切换后的主题。
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                subscribeTheme()
              </code>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              订阅主题变化。监听器会在实际主题变化时调用（接收{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'light'
              </code>{" "}
              或{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                'dark'
              </code>）。
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
            <strong>
              三种模式：
            </strong>支持亮色（light）、暗色（dark）和自动（auto）模式
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>自动检测：</strong>auto 模式会自动检测系统主题偏好
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>持久化存储：</strong>主题设置会保存到{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              localStorage
            </code>
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>Tailwind CSS 集成：</strong>自动在 HTML 元素上添加{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              dark
            </code>{" "}
            或{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              light
            </code>{" "}
            class
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>过渡动画：</strong>支持主题切换时的平滑过渡效果
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <strong>响应式更新：</strong>支持订阅主题变化，实时响应主题切换
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          与 Tailwind CSS 配合使用
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          主题插件会自动在 HTML 元素上添加{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            dark
          </code>{" "}
          或{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            light
          </code>{" "}
          class，配合 Tailwind CSS v4 的 dark mode 使用：
        </p>
        <CodeBlock
          code={`// Tailwind CSS v4 配置
@custom-variant dark (&:is(.dark *));

// 使用示例
<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
  内容
</div>`}
          language="css"
        />
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
            主题设置会保存到{" "}
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
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              getTheme()
            </code>{" "}
            返回用户设置的主题（可能是{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'auto'
            </code>），而{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              getActualTheme()
            </code>{" "}
            返回实际应用的主题（<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'light'
            </code>{" "}
            或{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              'dark'
            </code>）
          </li>
        </ul>
      </section>
    </article>
  );
}

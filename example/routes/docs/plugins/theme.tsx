/**
 * 插件 - theme 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "theme 插件 - DWeb 框架文档",
  description: "theme 插件使用指南 - 主题切换功能",
};

export default function ThemePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const basicUsageCode = `import { theme } from '@dreamer/dweb';

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "theme - 主题插件",
    description: "theme 插件提供主题切换功能，支持亮色、暗色和自动模式（跟随系统主题）。插件会自动在 HTML 元素上添加相应的 class，方便与 Tailwind CSS 的 dark mode 配合使用。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "text",
            content: "在 `dweb.config.ts` 或 `main.ts` 中配置 theme 插件：",
          },
          {
            type: "code",
            code: basicUsageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "客户端 API",
        blocks: [
          {
            type: "text",
            content: "在客户端组件中使用主题功能（从 `@dreamer/dweb/client` 导入）：",
          },
          {
            type: "code",
            code: clientUsageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "React/Preact 组件示例",
        blocks: [
          {
            type: "text",
            content: "在 Preact/React 组件中使用主题切换的完整示例：",
          },
          {
            type: "code",
            code: reactExampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**`defaultTheme`** - 默认主题（'light' | 'dark' | 'auto'），默认 'auto'",
              "**`storageKey`** - localStorage 存储键名（默认 'theme'）",
              "**`transition`** - 是否启用主题切换过渡动画（默认 true）",
              "**`injectDataAttribute`** - 是否在 HTML 元素上添加 `data-theme` 属性（默认 true）",
              "**`injectBodyClass`** - 是否在 body 元素上添加主题类名（默认 true）",
              "**`themes`** - 自定义主题列表数组（字符串数组）",
              "**`injectScript`** - 是否在服务端注入主题脚本（默认 true）",
            ],
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "code",
            code: apiReferenceCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "**`getTheme()`** - 获取当前主题设置。返回 'light' | 'dark' | 'auto' | null。如果设置为 'auto'，会跟随系统主题。",
          },
          {
            type: "text",
            content: "**`getActualTheme()`** - 获取实际主题（处理 auto 模式）。返回 'light' | 'dark' | null。如果主题设置为 'auto'，会返回当前系统主题。",
          },
          {
            type: "text",
            content: "**`setTheme()`** - 设置主题。接受 'light'、'dark' 或 'auto'。",
          },
          {
            type: "text",
            content: "**`toggleTheme()`** - 切换主题（在 dark 和 light 之间切换）。返回切换后的主题。",
          },
          {
            type: "text",
            content: "**`switchTheme()`** - 切换到指定主题。返回切换后的主题。",
          },
          {
            type: "text",
            content: "**`subscribeTheme()`** - 订阅主题变化。监听器会在实际主题变化时调用（接收 'light' 或 'dark'）。",
          },
        ],
      },
      {
        title: "特性",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**三种模式**：支持亮色（light）、暗色（dark）和自动（auto）模式",
              "**自动检测**：auto 模式会自动检测系统主题偏好",
              "**持久化存储**：主题设置会保存到 `localStorage`",
              "**Tailwind CSS 集成**：自动在 HTML 元素上添加 `dark` 或 `light` class",
              "**过渡动画**：支持主题切换时的平滑过渡效果",
              "**响应式更新**：支持订阅主题变化，实时响应主题切换",
            ],
          },
        ],
      },
      {
        title: "与 Tailwind CSS 配合使用",
        blocks: [
          {
            type: "text",
            content: "主题插件会自动在 HTML 元素上添加 `dark` 或 `light` class，配合 Tailwind CSS v4 的 dark mode 使用：",
          },
          {
            type: "code",
            code: `// Tailwind CSS v4 配置
@custom-variant dark (&:is(.dark *));

// 使用示例
<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
  内容
</div>`,
            language: "css",
          },
        ],
      },
      {
        title: "注意事项",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "所有客户端 API 函数在服务端渲染时返回 `null`，不会报错",
              "主题设置会保存到 `localStorage`，仅在浏览器环境中可用",
              "建议在组件卸载时取消订阅，避免内存泄漏",
              "客户端 API 需要从 `@dreamer/dweb/client` 导入，而不是从 `@dreamer/dweb`",
              "`getTheme()` 返回用户设置的主题（可能是 'auto'），而 `getActualTheme()` 返回实际应用的主题（'light' 或 'dark'）",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}

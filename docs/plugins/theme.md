### theme - 主题切换

主题插件提供主题切换功能，支持亮色、暗色和自动模式（跟随系统主题）。插件会自动在 HTML 元素上添加相应的 class，方便与 Tailwind CSS 的 dark mode 配合使用。

**基本配置：**

```typescript
import { theme } from "@dreamer/dweb/plugins";

app.plugin(theme({
  defaultTheme: "light", // 'light' | 'dark' | 'auto'（默认 'auto'）
  storageKey: "theme", // localStorage 键名（默认 'theme'）
  injectDataAttribute: true, // 是否在 HTML 上添加 data-theme 属性（默认 true）
  injectBodyClass: true, // 是否添加类名到 body（默认 true）
  transition: true, // 主题切换动画（默认 true）
  injectScript: true, // 是否注入客户端脚本（默认 true）
}));
```

**配置选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `defaultTheme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | 默认主题，`'auto'` 会跟随系统主题 |
| `storageKey` | `string` | `'theme'` | localStorage 存储键名 |
| `injectDataAttribute` | `boolean` | `true` | 是否在 HTML 元素上添加 `data-theme` 属性 |
| `injectBodyClass` | `boolean` | `true` | 是否在 body 元素上添加主题类名 |
| `transition` | `boolean` | `true` | 是否启用主题切换过渡动画 |
| `injectScript` | `boolean` | `true` | 是否注入客户端脚本 |

**客户端 API（推荐方式）：**

```typescript
import { 
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
const currentValue = getThemeValue(); // 'light' | 'dark' | null
```

**在 React/Preact 组件中使用：**

```typescript
import { useEffect, useState } from 'preact/hooks';
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
}
```

**在 Chart.js 中使用：**

```typescript
import { Chart, registerables } from 'chart.js';
import { getActualTheme, subscribeTheme } from '@dreamer/dweb/client';

Chart.register(...registerables);

// 创建图表
const ctx = document.getElementById('myChart');
const currentTheme = getActualTheme();

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{
      label: 'Sales',
      data: [10, 20, 30],
    }],
  },
  options: {
    plugins: {
      legend: {
        labels: {
          color: currentTheme === 'dark' ? '#fff' : '#000',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: currentTheme === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: currentTheme === 'dark' ? '#333' : '#ddd',
        },
      },
      y: {
        ticks: {
          color: currentTheme === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: currentTheme === 'dark' ? '#333' : '#ddd',
        },
      },
    },
  },
});

// 订阅主题变化，自动更新图表
const unsubscribe = subscribeTheme((theme) => {
  chart.options.plugins.legend.labels.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.x.ticks.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.x.grid.color = theme === 'dark' ? '#333' : '#ddd';
  chart.options.scales.y.ticks.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.y.grid.color = theme === 'dark' ? '#333' : '#ddd';
  chart.update();
});
```

**与 Tailwind CSS 配合使用：**

主题插件会自动在 HTML 元素上添加 `dark` 或 `light` class，配合 Tailwind CSS v4 的 dark mode 使用：

```css
/* Tailwind CSS v4 配置 */
@custom-variant dark (&:is(.dark *));

/* 使用示例 */
<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
  内容
</div>
```

**特性：**

- ✅ 三种模式：支持亮色（light）、暗色（dark）和自动（auto）模式
- ✅ 自动检测：auto 模式会自动检测系统主题偏好
- ✅ 持久化存储：主题设置会保存到 localStorage
- ✅ Tailwind CSS 集成：自动在 HTML 元素上添加 `dark` 或 `light` class
- ✅ 过渡动画：支持主题切换时的平滑过渡效果
- ✅ 响应式更新：支持订阅主题变化，实时响应主题切换

**注意事项：**

- 所有客户端 API 函数在服务端渲染时返回 `null`，不会报错
- 主题设置会保存到 localStorage，仅在浏览器环境中可用
- 建议在组件卸载时取消订阅，避免内存泄漏
- 客户端 API 需要从 `@dreamer/dweb/client` 导入，而不是从 `@dreamer/dweb`
- `getTheme()` 返回用户设置的主题（可能是 `'auto'`），而 `getActualTheme()` 返回实际应用的主题（`'light'` 或 `'dark'`）

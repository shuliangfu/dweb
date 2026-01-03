/**
 * 功能模块 - 热模块替换 (HMR) 文档页面
 * 展示 DWeb 框架的 HMR 功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "热模块替换 (HMR) - DWeb 框架文档",
  description:
    "DWeb 框架的热模块替换功能使用指南，在开发模式下自动监听文件变化并实时更新页面",
};

export default function FeaturesHmrPage() {
  // 快速开始
  const quickStartCode = `# HMR 功能在开发模式下自动启用，无需额外配置
deno task dev

# 开发服务器启动后，HMR 会自动：
# - 监听 routes/ 目录下的文件变化
# - 监听配置文件变化（如 dweb.config.ts）
# - 通过 WebSocket 向前端推送更新`;

  // 工作原理
  const howItWorksCode = `HMR 工作原理：

1. 文件监听
   - 使用 Deno.watchFs() API 监听文件系统变化
   - 监听组件文件（.tsx, .ts）：自动编译并通过 WebSocket 推送
   - 监听样式文件（.css）：自动重新加载
   - 监听配置文件：触发服务器重启

2. WebSocket 通信
   - HMR 服务器在独立端口（默认 24678）上运行 WebSocket 服务器
   - 客户端通过 WebSocket 连接接收更新通知

3. 智能更新
   - CSS 文件：直接重新加载样式
   - 组件文件：编译后推送更新，保持组件状态
   - 其他文件：触发页面刷新`;

  // 配置选项
  const configCode = `// dweb.config.ts
export default {
  dev: {
    // HMR 服务器端口（默认 24678）
    hmrPort: 24678,
    
    // 文件变化重载延迟（毫秒，默认 300）
    reloadDelay: 300,
  },
};`;

  // 文件监听范围
  const watchScopeCode = `HMR 会自动忽略以下文件：

- 以 . 开头的文件（隐藏文件）
- 以 .tmp 结尾的文件
- 以 ~ 结尾的文件
- node_modules/ 目录
- .deno/ 目录`;

  // 性能优化
  const performanceCode = `性能优化：

1. 编译缓存
   - 缓存已编译的组件代码
   - 根据文件修改时间判断是否需要重新编译
   - 减少重复编译，提升更新速度

2. 防抖处理
   - 文件变化事件使用防抖处理，避免频繁触发更新
   - 默认延迟 300 毫秒（可通过 reloadDelay 配置）

3. 路由匹配
   - HMR 会检查修改的文件是否属于当前路由
   - 如果修改的文件不属于当前路由，不会更新当前页面
   - 避免错误更新页面（例如修改 /about 页面时，不会更新 / 页面）`;

  // 使用示例
  const exampleCode = `// 修改 routes/index.tsx
export default function Home() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>首页</h1>
      <button onClick={() => setCount(count + 1)}>
        计数: {count}
      </button>
    </div>
  );
}

// 保存文件后，HMR 会自动：
// 1. 检测文件变化
// 2. 编译组件
// 3. 通过 WebSocket 推送更新
// 4. 客户端接收更新并替换组件
// 5. 保持组件状态（count 的值不会丢失）`;

  const content = {
    title: "热模块替换 (HMR)",
    description:
      "DWeb 框架提供了强大的热模块替换（HMR）功能，在开发模式下自动监听文件变化并实时更新页面，无需手动刷新浏览器。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "bash",
          },
        ],
      },
      {
        title: "工作原理",
        blocks: [
          {
            type: "code",
            code: howItWorksCode,
            language: "text",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "code",
            code: configCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "文件监听范围",
        blocks: [
          {
            type: "code",
            code: watchScopeCode,
            language: "text",
          },
        ],
      },
      {
        title: "性能优化",
        blocks: [
          {
            type: "code",
            code: performanceCode,
            language: "text",
          },
        ],
      },
      {
        title: "使用示例",
        blocks: [
          {
            type: "code",
            code: exampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[开发服务器](/docs/features/dev)",
              "[路由系统](/docs/core/router)",
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

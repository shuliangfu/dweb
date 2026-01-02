/**
 * 插件 - performance 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "performance 插件 - DWeb 框架文档",
  description: "performance 插件使用指南",
};

export default function PerformancePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const performanceCode = `import { performance } from '@dreamer/dweb';

plugins: [
  performance({
    enabled: true,
    metrics: ['responseTime', 'memoryUsage'],
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "performance - 性能监控",
    description: "performance 插件用于监控应用性能，收集性能指标。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: performanceCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`config`** - 性能监控配置对象，包含：",
                  "  - `collectWebVitals` - 是否收集 Web Vitals",
                  "  - `collectResourceTiming` - 是否收集资源加载时间",
                  "  - `collectApiTiming` - 是否收集 API 响应时间",
                  "  - `endpoint` - 上报端点",
                  "  - `reportInterval` - 上报间隔（毫秒）",
                  "  - `logToConsole` - 是否在控制台输出",
                  "  - `sampleRate` - 采样率（0-1）",
                  "**`injectClientScript`** - 是否在客户端注入监控脚本（默认 true）",
                  "**`onMetrics`** - 自定义指标收集函数，接收 PerformanceMetrics 对象，返回 void 或 Promise<void>",
                ],
              },
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

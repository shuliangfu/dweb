/**
 * 性能优化工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "性能优化工具 - DWeb 框架文档",
  description:
    "DWeb 框架的性能优化工具函数，提供防抖、节流、批量处理、内存监控等功能",
};

export default function PerformancePage() {
  const quickStartCode =
    `import { debounce, throttle, batchProcess, getMemoryUsage, formatMemorySize } from "@dreamer/dweb/utils/performance";

// 防抖函数
const debouncedSearch = debounce((query: string) => {
  console.log("搜索:", query);
}, 300);

// 节流函数
const throttledScroll = throttle(() => {
  console.log("滚动事件");
}, 100);

// 批量处理
const results = await batchProcess(items, async (item) => {
  return await processItem(item);
}, 10);

// 内存监控
const memory = getMemoryUsage();
console.log(formatMemorySize(memory.heapUsed));`;

  const debounceCode =
    `import { debounce } from "@dreamer/dweb/utils/performance";

// 搜索输入防抖
const debouncedSearch = debounce((query: string) => {
  // 执行搜索逻辑
  searchAPI(query);
}, 300);

// 使用
input.addEventListener("input", (e) => {
  debouncedSearch(e.target.value);
});`;

  const throttleCode =
    `import { throttle } from "@dreamer/dweb/utils/performance";

// 滚动事件节流
const throttledScroll = throttle(() => {
  // 执行滚动处理逻辑
  updateScrollPosition();
}, 100);

// 使用
window.addEventListener("scroll", throttledScroll);`;

  const batchProcessCode =
    `import { batchProcess } from "@dreamer/dweb/utils/performance";

// 批量处理数据
const items = [/* 大量数据 */];
const results = await batchProcess(
  items,
  async (item) => {
    // 处理单个项目
    return await processItem(item);
  },
  10 // 每批处理 10 个项目
);`;

  const memoryCode =
    `import { getMemoryUsage, formatMemorySize } from "@dreamer/dweb/utils/performance";

// 获取内存使用情况
const memory = getMemoryUsage();
console.log({
  rss: memory.rss,           // 常驻集大小
  heapTotal: memory.heapTotal, // 堆总大小
  heapUsed: memory.heapUsed,   // 已使用堆大小
  external: memory.external,   // 外部内存
});

// 格式化内存大小
formatMemorySize(1024);        // "1.00 KB"
formatMemorySize(1048576);      // "1.00 MB"
formatMemorySize(1073741824);   // "1.00 GB"`;

  const searchExampleCode =
    `import { debounce } from "@dreamer/dweb/utils/performance";

const searchInput = document.getElementById("search");

const debouncedSearch = debounce(async (query: string) => {
  if (query.length < 2) return;

  const results = await fetch(\`/api/search?q=\${query}\`)
    .then(res => res.json());

  renderResults(results);
}, 300);

searchInput.addEventListener("input", (e) => {
  debouncedSearch(e.target.value);
});`;

  const resizeExampleCode =
    `import { throttle } from "@dreamer/dweb/utils/performance";

const throttledResize = throttle(() => {
  // 更新布局
  updateLayout();
}, 200);

window.addEventListener("resize", throttledResize);`;

  const batchExampleCode =
    `import { batchProcess } from "@dreamer/dweb/utils/performance";

// 批量上传文件
const files = [/* 文件列表 */];
const uploadResults = await batchProcess(
  files,
  async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    return await response.json();
  },
  5 // 每批上传 5 个文件
);`;

  const memoryExampleCode =
    `import { getMemoryUsage, formatMemorySize } from "@dreamer/dweb/utils/performance";

// 定期监控内存使用
setInterval(() => {
  const memory = getMemoryUsage();
  console.log(\`堆内存使用: \${formatMemorySize(memory.heapUsed)}\`);
  console.log(\`总内存: \${formatMemorySize(memory.heapTotal)}\`);
}, 5000);`;

  const apiCode = `// 防抖函数
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void

// 节流函数
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void

// 批量处理函数
function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  batchSize?: number,
): Promise<R[]>

// 获取内存使用情况
function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

// 格式化内存大小
function formatMemorySize(bytes: number): string`;

  const content = {
    title: "性能优化工具",
    description:
      "提供性能优化相关的工具函数，包括防抖、节流、批量处理、内存监控等功能。",
    sections: [
      {
        title: "环境兼容性",
        blocks: [
          {
            type: "alert",
            variant: "info",
            title: "环境兼容性说明",
            content:
              "- `debounce`、`throttle`、`batchProcess`、`formatMemorySize`：**通用**（服务端和客户端都可用）\n- `getMemoryUsage`：**服务端专用**（仅在 Deno 服务端环境可用，客户端调用会抛出异常）",
          },
        ],
      },
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "防抖和节流",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "防抖函数",
            blocks: [
              {
                type: "text",
                content:
                  "防抖函数用于优化频繁调用的函数，在指定时间内只执行最后一次调用。",
              },
              {
                type: "code",
                code: debounceCode,
                language: "typescript",
              },
              {
                type: "text",
                content:
                  "**参数：**\n- `func`: 要防抖的函数\n- `wait`: 等待时间（毫秒）\n\n**返回值：** 防抖后的函数",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "节流函数",
            blocks: [
              {
                type: "text",
                content:
                  "节流函数用于限制函数调用频率，在指定时间内最多执行一次。",
              },
              {
                type: "code",
                code: throttleCode,
                language: "typescript",
              },
              {
                type: "text",
                content:
                  "**参数：**\n- `func`: 要节流的函数\n- `limit`: 时间限制（毫秒）\n\n**返回值：** 节流后的函数",
              },
            ],
          },
        ],
      },
      {
        title: "批量处理",
        blocks: [
          {
            type: "text",
            content:
              "批量处理函数用于优化大量数据的处理，将数据分批处理以避免内存溢出或性能问题。",
          },
          {
            type: "code",
            code: batchProcessCode,
            language: "typescript",
          },
          {
            type: "text",
            content:
              "**参数：**\n- `items`: 要处理的数据数组\n- `processor`: 处理函数，接收单个项目并返回处理结果\n- `batchSize`: 每批处理的数量，默认为 10\n\n**返回值：** Promise，解析为处理结果数组\n\n**使用场景：**\n- 批量数据库操作\n- 批量 API 请求\n- 大量文件处理\n- 图片批量处理",
          },
        ],
      },
      {
        title: "内存监控",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "获取内存使用情况",
            blocks: [
              {
                type: "text",
                content:
                  "获取当前进程的内存使用情况（仅在服务端 Deno 环境中可用）。",
              },
              {
                type: "code",
                code: memoryCode,
                language: "typescript",
              },
              {
                type: "text",
                content:
                  "**返回值：** 内存使用情况对象\n- `rss`: 常驻集大小（Resident Set Size）\n- `heapTotal`: 堆总大小\n- `heapUsed`: 已使用堆大小\n- `external`: 外部内存\n\n**注意：** 此函数仅在服务端 Deno 环境中可用。在客户端环境调用会抛出异常。",
              },
            ],
          },
        ],
      },
      {
        title: "使用示例",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "搜索输入防抖",
            blocks: [
              {
                type: "code",
                code: searchExampleCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "窗口大小调整节流",
            blocks: [
              {
                type: "code",
                code: resizeExampleCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "批量数据处理",
            blocks: [
              {
                type: "code",
                code: batchExampleCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "内存监控示例",
            blocks: [
              {
                type: "code",
                code: memoryExampleCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "code",
            code: apiCode,
            language: "typescript",
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

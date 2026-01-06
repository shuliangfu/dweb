/**
 * 工具函数 - 工具函数概述文档页面
 * 展示 DWeb 框架的工具函数模块概述
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "工具函数概述 - DWeb 框架文档",
  description:
    "DWeb 框架的工具函数库，提供数组、字符串、时间、HTTP、Web3 等常用工具函数",
};

export default function UtilsOverviewPage() {
  // 快速开始示例
  const quickStartCode = `// 导入需要的工具函数
import { chunk, unique } from "@dreamer/dweb/utils/array";
import { formatDate, formatCurrency } from "@dreamer/dweb/utils/format";
import { debounce, throttle } from "@dreamer/dweb/utils/performance";
import { http, get, post } from "@dreamer/dweb/utils/http";
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

// 数组操作
const chunks = chunk([1, 2, 3, 4, 5], 2);
const uniqueItems = unique([1, 2, 2, 3, 3, 3]);

// 格式化
const date = formatDate(new Date(), "YYYY-MM-DD");
const price = formatCurrency(1234.56);

// 性能优化
const debouncedSearch = debounce((query) => {
  console.log("搜索:", query);
}, 300);

// HTTP 请求
const data = await get("/api/users");

// Web3 操作
const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});`;

  // 页面文档数据
  const content = {
    title: "工具函数概述",
    description:
      "DWeb 框架提供了丰富的工具函数库，涵盖数组、字符串、时间、HTTP、Web3 等常用功能，帮助开发者快速构建应用。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "text",
            content:
              "工具函数按功能模块组织，每个模块都有独立的导入路径。你可以根据需要导入特定的函数。",
          },
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "功能模块",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**[数组工具 (array)](/docs/utils/array)** - 数组分块、去重、分组、排序、交集、并集等操作",
              "**[缓存工具 (cache)](/docs/utils/cache)** - LRU 缓存、TTL 缓存、内存缓存管理",
              "**[加密工具 (crypto)](/docs/utils/crypto)** - 随机字符串、UUID 生成、哈希、加密解密",
              "**[文件工具 (file)](/docs/utils/file)** - 文件读取、保存、压缩、MIME 类型检测",
              "**[格式化工具 (format)](/docs/utils/format)** - 数字、货币、日期、文件大小、百分比格式化",
              "**[HTTP 工具 (http)](/docs/utils/http)** - HTTP 请求客户端、拦截器、取消请求、重试机制",
              "**[数学工具 (math)](/docs/utils/math)** - 数值限制、四舍五入、随机数、统计计算、距离计算",
              "**[性能工具 (performance)](/docs/utils/performance)** - 防抖、节流、批量处理、内存监控",
              "**[存储工具 (storage)](/docs/utils/storage)** - localStorage/sessionStorage 封装、过期时间管理",
              "**[字符串工具 (string)](/docs/utils/string)** - 大小写转换、驼峰命名、短横线命名、蛇形命名",
              "**[时间工具 (time)](/docs/utils/time)** - 日期加减、日期比较、日期范围、开始/结束时间",
              "**[URL 工具 (url)](/docs/utils/url)** - URL 解析、构建、查询参数、哈希处理",
              "**[通用工具 (utils)](/docs/utils/utils)** - 深拷贝、深度合并、对象操作、空值判断、重试函数",
              "**[验证工具 (validation)](/docs/utils/validation)** - 数据验证、格式校验、规则检查",
              "**[Web3 工具 (web3)](/docs/utils/web3)** - 钱包连接、合约交互、交易处理、事件监听",
            ],
          },
        ],
      },
      {
        title: "导入方式",
        blocks: [
          {
            type: "text",
            content:
              "每个工具模块都有独立的导入路径，使用 `@dreamer/dweb/utils/{模块名}` 格式导入：",
          },
          {
            type: "code",
            code: `// 数组工具
import { chunk, unique, groupBy } from "@dreamer/dweb/utils/array";

// 字符串工具
import { toCamelCase, toKebabCase } from "@dreamer/dweb/utils/string";

// 时间工具
import { addDays, diffDays, isToday } from "@dreamer/dweb/utils/time";

// HTTP 工具
import { http, get, post } from "@dreamer/dweb/utils/http";

// Web3 工具
import { createWeb3Client, fromWei, toWei } from "@dreamer/dweb/utils/web3";`,
            language: "typescript",
          },
        ],
      },
      {
        title: "环境兼容性",
        blocks: [
          {
            type: "text",
            content:
              "大部分工具函数都可以在服务端和客户端使用，但部分功能有环境限制：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "**通用模块**：array、string、math、time、url、utils、validation、format、cache - 可在服务端和客户端使用",
              "**客户端模块**：storage - 依赖浏览器 localStorage/sessionStorage API",
              "**混合模块**：http、file、performance - 主要功能通用，部分功能需要特定环境",
              "**Web3 模块**：web3 - 钱包连接需要在浏览器环境，RPC 调用可在服务端使用",
              "**加密模块**：crypto - 依赖 Web Crypto API，需要现代浏览器或 Deno 环境",
            ],
          },
        ],
      },
      {
        title: "使用建议",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**按需导入**：只导入需要的函数，减少打包体积",
              "**类型安全**：所有函数都提供完整的 TypeScript 类型定义",
              "**性能优化**：使用防抖、节流等性能工具优化高频操作",
              "**错误处理**：HTTP 和 Web3 工具提供完善的错误处理机制",
              "**文档参考**：每个模块都有详细的文档和示例代码",
            ],
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
              "[核心功能](/docs/core) - 框架核心功能",
              "[插件系统](/docs/plugins) - 插件扩展",
              "[中间件](/docs/middleware) - 中间件系统",
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

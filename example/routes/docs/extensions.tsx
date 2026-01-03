/**
 * 扩展模块 - 扩展系统文档页面
 * 展示 DWeb 框架的扩展系统功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "扩展系统 - DWeb 框架文档",
  description:
    "DWeb 框架的扩展系统使用指南，为原生类型提供实用的扩展方法和丰富的辅助函数库",
};

export default function ExtensionsPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 初始化扩展系统
  const initCode = `import { setupExtensions } from "@dreamer/dweb";

// 初始化所有内置扩展
setupExtensions();`;

  // 使用扩展方法
  const extensionMethodsCode = `// String 扩展
"hello world".capitalize(); // "Hello world"
"hello-world".toCamelCase(); // "helloWorld"
"test@example.com".isEmail(); // true

// Array 扩展
[1, 2, 3, 2, 1].unique(); // [1, 2, 3]
[{ id: 1 }, { id: 2 }, { id: 1 }].uniqueBy('id'); // [{ id: 1 }, { id: 2 }]

// Date 扩展
new Date().format("YYYY-MM-DD"); // "2024-01-15"
new Date().fromNow(); // "2小时前"
new Date().isToday(); // true

// Object 扩展
const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
user.pick(['name', 'email']); // { name: 'Alice', email: 'alice@example.com' }
user.omit(['id']); // { name: 'Alice', email: 'alice@example.com' }`;

  // 使用辅助函数
  const helpersCode = `import { 
  validateEmail, 
  formatCurrency, 
  sha256, 
  setCache,
  http,
  all,
  upload,
} from "@dreamer/dweb";

// 验证函数
validateEmail("test@example.com"); // true

// 格式化函数
formatCurrency(1234.56); // "¥1,234.56"

// 加密函数
const hash = await sha256("hello world");

// 缓存函数
setCache("key", "value", 3600); // 缓存1小时

// HTTP 请求
const users = await http.get("/api/users");

// 并发请求
const [users, posts] = await all([
  http.get("/api/users"),
  http.get("/api/posts"),
]);

// 文件上传
await upload("/api/upload", file);`;

  // 内置扩展列表
  const builtinExtensionsCode = `内置扩展包括：

- String 扩展：capitalize、toCamelCase、isEmail 等
- Array 扩展：unique、uniqueBy、groupBy 等
- Date 扩展：format、fromNow、isToday 等
- Object 扩展：pick、omit、deepMerge 等
- Request 扩展：getBody、getQuery 等`;

  // 辅助函数列表
  const helpersListCode = `辅助函数包括：

- 验证函数：validateEmail、validatePhone 等
- 格式化函数：formatCurrency、formatDate 等
- 加密函数：sha256、md5、sign 等
- 缓存函数：setCache、getCache 等
- HTTP 请求库：http.get、http.post 等
- Web3 操作库：连接、调用合约等
- 工具函数：防抖、节流、深拷贝等
- 存储工具：localStorage/sessionStorage 封装
- URL 工具：URL 解析、构建、查询参数处理
- 时间工具：时间计算、转换、判断等
- 数组工具：数组操作补充工具函数
- 数学工具：数学计算辅助函数
- 文件工具：文件处理工具函数`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "扩展系统",
    description:
      "DWeb 框架提供了强大的扩展系统，为原生类型（String、Array、Date、Object、Request）提供实用的扩展方法，以及丰富的辅助函数库，帮助开发者提高开发效率。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "初始化扩展系统",
            blocks: [
              {
                type: "text",
                content: "在使用扩展方法之前，需要先初始化扩展系统：",
              },
              {
                type: "code",
                code: initCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用扩展方法",
            blocks: [
              {
                type: "text",
                content: "初始化后，可以直接在原生类型上使用扩展方法：",
              },
              {
                type: "code",
                code: extensionMethodsCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用辅助函数",
            blocks: [
              {
                type: "text",
                content: "辅助函数可以直接导入使用，无需初始化：",
              },
              {
                type: "code",
                code: helpersCode,
                language: "typescript",
              },
            ],
          },
        ],
      },

      {
        title: "内置扩展",
        blocks: [
          {
            type: "code",
            code: builtinExtensionsCode,
            language: "text",
          },
          {
            type: "text",
            content: "更多详细信息，请参考：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "[String 扩展](/docs/extensions/builtin/string) - 字符串处理方法",
              "[Array 扩展](/docs/extensions/builtin/array) - 数组操作方法",
              "[Date 扩展](/docs/extensions/builtin/date) - 日期处理方法",
              "[Object 扩展](/docs/extensions/builtin/object) - 对象操作方法",
              "[Request 扩展](/docs/extensions/builtin/request) - 请求处理方法",
            ],
          },
        ],
      },
      {
        title: "辅助函数",
        blocks: [
          {
            type: "code",
            code: helpersListCode,
            language: "text",
          },
          {
            type: "text",
            content: "更多详细信息，请参考：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "[验证函数](/docs/extensions/helpers/validation) - 数据验证工具",
              "[格式化函数](/docs/extensions/helpers/format) - 数据格式化工具",
              "[加密函数](/docs/extensions/helpers/crypto) - 加密、哈希、签名工具",
              "[缓存函数](/docs/extensions/helpers/cache) - 内存缓存工具",
              "[HTTP 请求库](/docs/extensions/helpers/http) - 前端 HTTP 请求库",
              "[Web3 操作库](/docs/extensions/helpers/web3) - Web3 相关操作",
              "[工具函数库](/docs/extensions/helpers/utils) - 防抖、节流、深拷贝等",
              "[存储工具](/docs/extensions/helpers/storage) - localStorage/sessionStorage 封装",
              "[URL 工具](/docs/extensions/helpers/url) - URL 解析、构建、查询参数处理",
              "[时间工具](/docs/extensions/helpers/time) - 时间计算、转换、判断等功能",
              "[数组工具](/docs/extensions/helpers/array) - 数组操作补充工具函数",
              "[数学工具](/docs/extensions/helpers/math) - 数学计算辅助函数",
              "[文件工具](/docs/extensions/helpers/file) - 文件处理工具函数",
            ],
          },
        ],
      },
      {
        title: "自定义扩展",
        blocks: [
          {
            type: "text",
            content:
              "你可以注册自定义扩展方法，扩展原生类型的功能。详细说明请参考 [自定义扩展](/docs/extensions/custom) 文档。",
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
              "[核心模块](/docs/core/application) - 框架核心功能",
              "[中间件](/docs/middleware) - 中间件系统",
              "[插件](/docs/plugins) - 插件系统",
              "[控制台工具](/docs/console) - 命令行工具",
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

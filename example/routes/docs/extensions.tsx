/**
 * 扩展模块 - 扩展系统文档页面
 * 展示 DWeb 框架的扩展系统功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        扩展系统
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb
        框架提供了强大的扩展系统，为原生类型（String、Array、Date、Object、Request）提供实用的扩展方法，
        以及丰富的辅助函数库，帮助开发者提高开发效率。
      </p>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          初始化扩展系统
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在使用扩展方法之前，需要先初始化扩展系统：
        </p>
        <CodeBlock code={initCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用扩展方法
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          初始化后，可以直接在原生类型上使用扩展方法：
        </p>
        <CodeBlock code={extensionMethodsCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用辅助函数
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          辅助函数可以直接导入使用，无需初始化：
        </p>
        <CodeBlock code={helpersCode} language="typescript" />
      </section>

      {/* 内置扩展 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          内置扩展
        </h2>
        <CodeBlock code={builtinExtensionsCode} language="text" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
          更多详细信息，请参考：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/extensions/builtin/string"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              String 扩展
            </a>{" "}
            - 字符串处理方法
          </li>
          <li>
            <a
              href="/docs/extensions/builtin/array"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Array 扩展
            </a>{" "}
            - 数组操作方法
          </li>
          <li>
            <a
              href="/docs/extensions/builtin/date"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Date 扩展
            </a>{" "}
            - 日期处理方法
          </li>
          <li>
            <a
              href="/docs/extensions/builtin/object"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Object 扩展
            </a>{" "}
            - 对象操作方法
          </li>
          <li>
            <a
              href="/docs/extensions/builtin/request"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Request 扩展
            </a>{" "}
            - 请求处理方法
          </li>
        </ul>
      </section>

      {/* 辅助函数 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          辅助函数
        </h2>
        <CodeBlock code={helpersListCode} language="text" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
          更多详细信息，请参考：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/extensions/helpers/validation"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              验证函数
            </a>{" "}
            - 数据验证工具
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/format"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              格式化函数
            </a>{" "}
            - 数据格式化工具
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/crypto"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              加密函数
            </a>{" "}
            - 加密、哈希、签名工具
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/cache"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              缓存函数
            </a>{" "}
            - 内存缓存工具
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/http"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              HTTP 请求库
            </a>{" "}
            - 前端 HTTP 请求库
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/web3"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Web3 操作库
            </a>{" "}
            - Web3 相关操作
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/utils"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              工具函数库
            </a>{" "}
            - 防抖、节流、深拷贝等
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/storage"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              存储工具
            </a>{" "}
            - localStorage/sessionStorage 封装
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/url"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              URL 工具
            </a>{" "}
            - URL 解析、构建、查询参数处理
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/time"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              时间工具
            </a>{" "}
            - 时间计算、转换、判断等功能
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/array"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              数组工具
            </a>{" "}
            - 数组操作补充工具函数
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/math"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              数学工具
            </a>{" "}
            - 数学计算辅助函数
          </li>
          <li>
            <a
              href="/docs/extensions/helpers/file"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              文件工具
            </a>{" "}
            - 文件处理工具函数
          </li>
        </ul>
      </section>

      {/* 自定义扩展 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          自定义扩展
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          你可以注册自定义扩展方法，扩展原生类型的功能。详细说明请参考{" "}
          <a
            href="/docs/extensions/custom"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            自定义扩展
          </a>{" "}
          文档。
        </p>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              核心模块
            </a>{" "}
            - 框架核心功能
          </li>
          <li>
            <a
              href="/docs/middleware"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              中间件
            </a>{" "}
            - 中间件系统
          </li>
          <li>
            <a
              href="/docs/plugins"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              插件
            </a>{" "}
            - 插件系统
          </li>
          <li>
            <a
              href="/docs/console"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              控制台工具
            </a>{" "}
            - 命令行工具
          </li>
        </ul>
      </section>
    </article>
  );
}

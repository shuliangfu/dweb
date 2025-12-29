/**
 * 功能模块 - 开发服务器 (dev) 文档页面
 * 展示 DWeb 框架的开发服务器功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "开发服务器 (dev) - DWeb 框架文档",
  description: "DWeb 框架的开发服务器使用指南，包括启动、热更新、开发工具等",
};

export default function FeaturesDevPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 启动开发服务器 - 单应用模式
  const singleAppCode = `# 启动开发服务器（默认端口 3000）
deno task dev

# 或使用 CLI 命令
deno run -A @dreamer/dweb/cli dev

# 指定端口（通过配置文件）
# 在 dweb.config.ts 中配置：
# server: { port: 8080 }`;

  // 启动开发服务器 - 多应用模式
  const multiAppCode = `# 启动所有应用
deno task dev

# 启动指定应用（使用应用名称）
deno run -A @dreamer/dweb/cli dev:app-name

# 或在 deno.json 中配置任务别名
# "dev:app-name": "deno run -A @dreamer/dweb/cli dev:app-name"`;

  // 开发服务器特性
  const featuresCode = `开发服务器特性：

- 自动热更新（HMR）：修改代码后自动重新加载
- 自动路由扫描：自动发现 routes/ 目录下的路由文件
- 自动加载中间件和插件：从 main.ts 或配置文件中加载
- 错误提示：详细的错误信息和堆栈跟踪
- 自动打开浏览器（可选）：配置 open: true 后自动打开浏览器`;

  // 热更新说明
  const hmrCode = `开发服务器支持热更新，修改代码后自动刷新：

- 服务端组件：自动重新加载
- 客户端组件：通过 WebSocket 推送更新
- 样式文件：自动重新编译`;

  // 开发工具
  const devToolsCode = `# 代码格式化
deno fmt                    # 格式化所有文件
deno fmt src/              # 格式化指定目录
deno fmt --check           # 检查格式（不修改文件）

# 代码检查
deno lint                   # 检查所有文件
deno lint src/             # 检查指定目录
deno lint --fix            # 自动修复可修复的问题

# 类型检查
deno check                  # 检查所有 TypeScript 文件
deno check src/            # 检查指定目录
deno check main.ts         # 检查特定文件

# 查看依赖树
deno info

# 清理缓存
deno cache --reload`;

  // 配置选项
  const configCode = `// dweb.config.ts
export default {
  dev: {
    // 是否自动打开浏览器（默认 false）
    open: true,
    
    // HMR 服务器端口（默认 24678）
    hmrPort: 24678,
    
    // 文件变化重载延迟（毫秒，默认 300）
    reloadDelay: 300,
  },
};`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        开发服务器 (dev)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb
        框架的开发服务器提供了强大的开发体验，包括热更新、自动路由扫描、错误提示等功能。
      </p>

      {/* 启动开发服务器 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          启动开发服务器
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          单应用模式
        </h3>
        <CodeBlock code={singleAppCode} language="bash" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          多应用模式
        </h3>
        <CodeBlock code={multiAppCode} language="bash" />
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>命令格式说明：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm mt-2">
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                dev
              </code>{" "}
              - 单应用模式，启动默认应用
            </li>
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                dev:app-name
              </code>{" "}
              - 多应用模式，启动指定名称的应用
            </li>
            <li>
              应用名称必须与{" "}
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                dweb.config.ts
              </code>{" "}
              中{" "}
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                apps
              </code>{" "}
              配置的键名一致
            </li>
          </ul>
        </div>
      </section>

      {/* 开发服务器特性 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          开发服务器特性
        </h2>
        <CodeBlock code={featuresCode} language="text" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          开发体验优化
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>智能 HMR</strong>：
            基于 WebSocket 的即时热更新机制，支持 CSS 毫秒级更新和组件状态保留，修改代码无需手动刷新浏览器。
          </li>
          <li>
            <strong>自动 TLS</strong>：
            开发环境自动生成自签名证书，一键开启 HTTPS 调试，方便测试 HTTP/2 和 Service Worker 等特性。
          </li>
          <li>
            <strong>惰性启动</strong>：
            路由和中间件采用按需加载策略，即使在大型项目中也能保持秒级启动速度。
          </li>
        </ul>
      </section>

      {/* 热更新 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          热更新 (HMR)
        </h2>
        <CodeBlock code={hmrCode} language="text" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
          更多关于 HMR 的详细信息，请参考{" "}
          <a
            href="/docs/features/hmr"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            热模块替换 (HMR)
          </a>{" "}
          文档。
        </p>
      </section>

      {/* 开发工具 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          开发工具
        </h2>
        <CodeBlock code={devToolsCode} language="bash" />
      </section>

      {/* 配置选项 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <CodeBlock code={configCode} language="typescript" />
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/features/hmr"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              热模块替换 (HMR)
            </a>
          </li>
          <li>
            <a
              href="/docs/features/build"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              构建
            </a>
          </li>
          <li>
            <a
              href="/docs/features/prod"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              生产服务器
            </a>
          </li>
          <li>
            <a
              href="/docs/deployment/development"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              开发指南
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

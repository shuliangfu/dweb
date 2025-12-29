/**
 * 功能模块 - 生产服务器 (prod) 文档页面
 * 展示 DWeb 框架的生产服务器功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "生产服务器 (prod) - DWeb 框架文档",
  description: "DWeb 框架的生产服务器使用指南，部署生产版本",
};

export default function FeaturesProdPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 生产服务器 - 单应用模式
  const singleAppCode = `# 启动生产服务器
deno task start

# 或使用 CLI 命令
deno run -A @dreamer/dweb/cli start

# 使用环境变量指定环境
DENO_ENV=production deno task start`;

  // 生产服务器 - 多应用模式
  const multiAppCode = `# 启动所有应用
deno task start

# 启动指定应用
deno run -A @dreamer/dweb/cli start:app-name

# 或在 deno.json 中配置任务别名
# "start:app-name": "deno run -A @dreamer/dweb/cli start:app-name"`;

  // 生产服务器特性
  const featuresCode = `生产服务器特性：

- 优化的性能：代码已编译和压缩
- 静态资源缓存：配置的缓存策略生效
- 错误处理：生产环境友好的错误信息
- 日志记录：可配置的日志级别和输出
- TLS 支持：支持 HTTPS（如果配置了证书）`;

  // 环境变量
  const envVarsCode = `环境变量：

- DENO_ENV - 环境名称（development、production 等）
- PORT - 服务器端口（会覆盖配置文件中的设置）
- 其他自定义环境变量可在配置文件中通过 Deno.env.get() 获取

示例：
DENO_ENV=production PORT=8080 deno task start`;

  // Docker 部署
  const dockerCode = `# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app

# 使用环境变量
docker run -p 3000:3000 -e DENO_ENV=production -e PORT=8080 dweb-app`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        生产服务器 (prod)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架的生产服务器提供了优化的性能和安全性，适合部署到生产环境。
      </p>

      {/* 启动生产服务器 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          启动生产服务器
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          单应用模式
        </h3>
        <CodeBlock code={singleAppCode} language="bash" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          多应用模式
        </h3>
        <CodeBlock code={multiAppCode} language="bash" />
      </section>

      {/* 生产服务器特性 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          生产服务器特性
        </h2>
        <CodeBlock code={featuresCode} language="text" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          生产环境优化
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>集群模式 (Cluster Mode)</strong>：
            支持 PUP_CLUSTER_INSTANCE 环境变量，自动适配端口偏移，无需手动配置即可实现多实例负载均衡部署。
          </li>
          <li>
            <strong>零拷贝服务 (Zero-Copy Serving)</strong>：
            静态文件服务采用零拷贝技术，直接将文件流传输到网络 socket，极大降低了 CPU 和内存占用。
          </li>
          <li>
            <strong>优雅关闭 (Graceful Shutdown)</strong>：
            内置信号处理机制（SIGINT, SIGTERM），确保在服务停止前完成正在处理的请求并正确释放数据库连接等资源。
          </li>
        </ul>
      </section>

      {/* 环境变量 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          环境变量
        </h2>
        <CodeBlock code={envVarsCode} language="text" />
      </section>

      {/* Docker 部署 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          Docker 部署
        </h2>
        <CodeBlock code={dockerCode} language="bash" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
          详细说明请参考{" "}
          <a
            href="/docs/deployment/docker"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Docker 部署
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
              href="/docs/features/build"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              构建
            </a>
          </li>
          <li>
            <a
              href="/docs/features/shutdown"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              优雅关闭
            </a>
          </li>
          <li>
            <a
              href="/docs/deployment/docker"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Docker 部署
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

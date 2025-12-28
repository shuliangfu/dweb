/**
 * 功能模块 - 环境变量 (env) 文档页面
 * 展示 DWeb 框架的环境变量管理功能
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "环境变量 (env) - DWeb 框架文档",
  description: "DWeb 框架的环境变量管理使用指南",
};

export default function FeaturesEnvPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 开发环境
  const devEnvCode = `# .env.development
PORT=3000
DB_HOST=localhost
DB_NAME=mydb_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
API_KEY=dev_api_key`;

  // 生产环境
  const prodEnvCode = `# .env.production
PORT=3000
DB_HOST=prod-db.example.com
DB_NAME=mydb
DB_USER=prod_user
DB_PASSWORD=prod_password
API_KEY=prod_api_key`;

  // 使用环境变量
  const usageCode = `// dweb.config.ts
export default {
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
  },
  database: {
    connection: {
      host: Deno.env.get("DB_HOST") || "localhost",
      database: Deno.env.get("DB_NAME") || "mydb",
      user: Deno.env.get("DB_USER"),
      password: Deno.env.get("DB_PASSWORD"),
    },
  },
};`;

  // 在代码中使用
  const codeUsageCode = `// 在代码中使用环境变量
const apiKey = Deno.env.get("API_KEY");
if (!apiKey) {
  throw new Error("API_KEY 环境变量未设置");
}

// 使用环境变量
const response = await fetch(\`https://api.example.com/data?key=\${apiKey}\`);`;

  // 环境变量文件优先级
  const priorityCode = `环境变量文件加载优先级（从高到低）：

1. .env.local（本地覆盖，不应提交到版本控制）
2. .env.development 或 .env.production（根据环境）
3. .env（默认配置）

注意：.env.local 中的变量会覆盖其他文件中的同名变量`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        环境变量 (env)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架支持使用环境变量来配置应用，支持不同环境的配置文件。
      </p>

      {/* 开发环境 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          开发环境
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          创建{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            .env.development
          </code>{" "}
          文件：
        </p>
        <CodeBlock code={devEnvCode} language="env" />
      </section>

      {/* 生产环境 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          生产环境
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          创建{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            .env.production
          </code>{" "}
          文件：
        </p>
        <CodeBlock code={prodEnvCode} language="env" />
      </section>

      {/* 使用环境变量 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用环境变量
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            dweb.config.ts
          </code>{" "}
          中使用环境变量：
        </p>
        <CodeBlock code={usageCode} language="typescript" />
      </section>

      {/* 在代码中使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在代码中使用
        </h2>
        <CodeBlock code={codeUsageCode} language="typescript" />
      </section>

      {/* 环境变量文件优先级 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          环境变量文件优先级
        </h2>
        <CodeBlock code={priorityCode} language="text" />
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 my-4 rounded">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>安全提示：</strong>请确保{" "}
            <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
              .env.local
            </code>{" "}
            和包含敏感信息的{" "}
            <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
              .env
            </code>{" "}
            文件已添加到{" "}
            <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
              .gitignore
            </code>，不要提交到版本控制系统。
          </p>
        </div>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/deployment/configuration"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              配置文档
            </a>
          </li>
          <li>
            <a
              href="/docs/features/dev"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              开发服务器
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
        </ul>
      </section>
    </article>
  );
}

/**
 * 插件 - 自定义插件文档页面
 * 展示如何创建自定义插件
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "创建自定义插件 - DWeb 框架文档",
  description: "如何创建自定义插件来扩展框架功能",
};

export default function CustomPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本结构
  const basicStructureCode =
    `import type { Plugin } from "@dreamer/dweb/core/plugin";

const myPlugin: Plugin = {
  name: "my-plugin",
  onInit: async (app) => {
    // 插件初始化
    console.log("Plugin initialized");
  },
  onRequest: async (req, res) => {
    // 每个请求前执行
    console.log("Request:", req.url);
  },
  onResponse: async (req, res, html) => {
    // 每个响应后执行，可以修改 HTML
    return html;
  },
  onError: async (error, req, res) => {
    // 发生错误时执行
    console.error("Error:", error);
  },
  onBuild: async (config) => {
    // 构建时执行
    console.log("Build config:", config);
  },
};

app.plugin(myPlugin);`;

  // 简单插件
  const simplePluginCode =
    `import type { Plugin } from "@dreamer/dweb/core/plugin";

const helloPlugin: Plugin = {
  name: "hello",
  onResponse: async (req, res, html) => {
    // 在 HTML 中注入脚本
    return html.replace(
      '</body>',
      '<script>console.log("Hello from plugin!")</script></body>'
    );
  },
};

app.plugin(helloPlugin);`;

  // 配置化插件
  const configurablePluginCode =
    `import type { Plugin } from "@dreamer/dweb/core/plugin";

interface MyPluginOptions {
  prefix: string;
  enabled: boolean;
}

function createMyPlugin(options: MyPluginOptions): Plugin {
  return {
    name: "my-plugin",
    onInit: async (app) => {
      if (!options.enabled) {
        return;
      }
      console.log("Plugin prefix:", options.prefix);
    },
    onRequest: async (req, res) => {
      if (options.enabled) {
        res.setHeader("X-Prefix", options.prefix);
      }
    },
  };
}

app.plugin(createMyPlugin({
  prefix: "api",
  enabled: true,
}));`;

  // 异步插件
  const asyncPluginCode =
    `import type { Plugin } from "@dreamer/dweb/core/plugin";

const asyncPlugin: Plugin = {
  name: "async-plugin",
  onInit: async (app) => {
    // 异步初始化
    const config = await fetch("/api/config").then(r => r.json());
    console.log("Plugin config loaded:", config);
  },
  onRequest: async (req, res) => {
    // 使用配置
    const config = await getConfig();
    (req as any).pluginConfig = config;
  },
};

app.plugin(asyncPlugin);`;

  // 带清理的插件
  const cleanupPluginCode =
    `import type { Plugin } from "@dreamer/dweb/core/plugin";

let intervalId: number | null = null;

const cleanupPlugin: Plugin = {
  name: "cleanup-plugin",
  onInit: async (app) => {
    // 设置定时任务
    intervalId = setInterval(() => {
      console.log("定时任务执行");
    }, 1000);
  },
  onBuild: async (config) => {
    // 清理资源
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },
};

app.plugin(cleanupPlugin);`;

  // 处理 API 请求的插件
  const apiPluginCode =
    `import type { Plugin } from "@dreamer/dweb/core/plugin";

const apiPlugin: Plugin = {
  name: "api-plugin",
  onRequest: async (req, res) => {
    // 处理特定的 API 路由
    if (req.url.startsWith("/api/plugin")) {
      res.json({ message: "Hello from plugin API" });
      return; // 提前返回，不继续处理
    }
  },
};

app.plugin(apiPlugin);`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        创建自定义插件
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        你可以创建自己的插件来扩展框架功能。
      </p>

      {/* 基本结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本结构
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          插件是一个对象，包含{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            name
          </code>{" "}
          和生命周期钩子：
        </p>
        <CodeBlock code={basicStructureCode} language="typescript" />
      </section>

      {/* 插件示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          插件示例
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          简单插件
        </h3>
        <CodeBlock code={simplePluginCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          配置化插件
        </h3>
        <CodeBlock code={configurablePluginCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          异步插件
        </h3>
        <CodeBlock code={asyncPluginCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          带清理的插件
        </h3>
        <CodeBlock code={cleanupPluginCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          处理 API 请求的插件
        </h3>
        <CodeBlock code={apiPluginCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          Plugin 接口
        </h3>
        <CodeBlock
          code={`interface Plugin {
  name: string;
  onInit?: (app: AppLike) => Promise<void> | void;
  onRequest?: (req: Request, res: Response) => Promise<void> | void;
  onResponse?: (req: Request, res: Response, html: string) => Promise<string> | string;
  onError?: (error: Error, req: Request, res: Response) => Promise<void> | void;
  onBuild?: (config: AppConfig) => Promise<void> | void;
}`}
          language="typescript"
        />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用插件
        </h3>
        <CodeBlock
          code={`// 在 Application 上使用
app.plugin(plugin);

// 在配置文件中使用
export default {
  plugins: [
    myPlugin(),
  ],
};`}
          language="typescript"
        />
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/plugins"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              插件概述
            </a>
          </li>
          <li>
            <a
              href="/docs/core/plugin"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              插件系统
            </a>
          </li>
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application
            </a>{" "}
            - 应用核心
          </li>
        </ul>
      </section>
    </article>
  );
}

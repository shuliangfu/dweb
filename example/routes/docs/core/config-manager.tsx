/**
 * 核心模块 - ConfigManager (配置管理器) 文档页面
 * 展示 DWeb 框架的配置管理器功能和使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "ConfigManager (配置管理器) - DWeb 框架文档",
  description: "DWeb 框架的配置管理器使用指南，统一管理应用配置的加载、验证和访问",
};

export default function CoreConfigManagerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用
  const basicUsageCode = `// main.ts
import { ConfigManager } from "@dreamer/dweb/core/config-manager";

// 创建配置管理器
const configManager = new ConfigManager("dweb.config.ts");

// 加载配置
await configManager.load();

// 获取配置
const config = configManager.getConfig();
const port = config.server?.port;`;

  // 多应用模式
  const multiAppCode = `// 加载特定应用的配置
const configManager = new ConfigManager("dweb.config.ts", "backend");
await configManager.load();
const config = configManager.getConfig();`;

  // 程序化设置配置
  const programmaticCode = `// 直接设置配置（用于测试或特殊场景）
import { ConfigManager } from "@dreamer/dweb/core/config-manager";
import type { AppConfig } from "@dreamer/dweb";

const configManager = new ConfigManager();

// 直接设置配置
const config: AppConfig = {
  server: { port: 3000 },
  routes: { dir: "routes" },
};

configManager.setConfig(config);
const loadedConfig = configManager.getConfig();`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        ConfigManager (配置管理器)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">ConfigManager</code> 统一管理应用配置的加载、验证和访问，
        提供类型安全的配置访问和配置合并功能。
      </p>

      {/* 概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          概述
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">ConfigManager</code> 封装了配置加载逻辑，
          提供统一的配置访问接口。
        </p>
      </section>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          多应用模式
        </h3>
        <CodeBlock code={multiAppCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          程序化设置配置
        </h3>
        <CodeBlock code={programmaticCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          构造函数
        </h3>
        <CodeBlock code={`constructor(configPath?: string, appName?: string)`} language="typescript" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <strong>参数：</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">configPath</code> (可选): 配置文件路径，如果不提供则自动查找 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">dweb.config.ts</code></li>
          <li><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">appName</code> (可选): 应用名称，用于多应用模式</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">load()</code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              加载配置文件。
            </p>
            <CodeBlock code={`await configManager.load();`} language="typescript" />
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">
              <strong>功能：</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 my-2 text-gray-700 dark:text-gray-300 text-sm">
              <li>从配置文件加载配置</li>
              <li>验证配置格式</li>
              <li>规范化配置值</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">getConfig()</code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取配置对象。
            </p>
            <CodeBlock code={`const config = configManager.getConfig();`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">getConfigDir()</code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取配置文件所在目录。
            </p>
            <CodeBlock code={`const configDir = configManager.getConfigDir();`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">setConfig(config)</code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              直接设置配置（用于测试或特殊场景）。
            </p>
            <CodeBlock code={`configManager.setConfig(config);`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">isLoaded()</code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              检查配置是否已加载。
            </p>
            <CodeBlock code={`if (configManager.isLoaded()) {
  const config = configManager.getConfig();
}`} language="typescript" />
          </div>
        </div>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/core/application" className="text-blue-600 dark:text-blue-400 hover:underline">Application (应用核心)</a></li>
          <li><a href="/docs/core/config" className="text-blue-600 dark:text-blue-400 hover:underline">配置管理 (Config)</a></li>
          <li><a href="/docs/deployment/configuration" className="text-blue-600 dark:text-blue-400 hover:underline">配置文档</a></li>
        </ul>
      </section>
    </article>
  );
}

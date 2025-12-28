/**
 * 扩展模块 - 控制台工具文档页面
 * 展示 DWeb 框架的控制台工具功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "控制台工具 - DWeb 框架文档",
  description:
    "DWeb 框架的控制台工具使用指南，用于创建美观的命令行界面、处理用户输入、输出格式化信息等",
};

export default function ConsolePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 导入模块
  const importCode = `// 导入所有控制台工具
import {
  // ANSI 工具
  colors,
  colorize,
  clearScreen,
  
  // 输出工具
  success,
  error,
  warning,
  info,
  separator,
  title,
  keyValue,
  
  // 命令类
  Command,
  
  // 输入工具
  prompt,
  confirm,
  input,
  select,
  
  // 表格工具
  table,
  progressBar,
} from "@dreamer/dweb/console";`;

  // 基本使用示例
  const basicUsageCode = `// 输出彩色消息
success("操作成功！");
error("发生错误！");
warning("警告信息！");
info("提示信息！");

// 输出分隔线
separator();

// 输出标题
title("DWeb 框架");

// 输出键值对
keyValue("版本", "1.0.0");
keyValue("端口", "3000");

// 输出表格
table([
  ["名称", "版本", "描述"],
  ["DWeb", "1.0.0", "Web 框架"],
  ["Deno", "1.40.0", "运行时"],
]);

// 用户输入
const name = await input("请输入您的姓名：");
const confirmed = await confirm("确认继续？");
const choice = await select("请选择选项：", ["选项1", "选项2", "选项3"]);`;

  // Command 类示例
  const commandCode = `import { Command } from "@dreamer/dweb/console";

// 创建命令
const cmd = new Command("my-command")
  .description("这是一个示例命令")
  .option("-p, --port <port>", "端口号", "3000")
  .option("-h, --host <host>", "主机地址", "localhost")
  .action(async (options) => {
    console.log(\`服务器运行在 \${options.host}:\${options.port}\`);
  });

// 执行命令
await cmd.parse(Deno.args);`;

  // 进度条示例
  const progressCode = `import { progressBar } from "@dreamer/dweb/console";

// 创建进度条
const bar = progressBar({
  total: 100,
  width: 50,
  complete: "=",
  incomplete: "-",
});

// 更新进度
for (let i = 0; i <= 100; i++) {
  bar.update(i);
  await new Promise(resolve => setTimeout(resolve, 50));
}

bar.finish();`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        控制台工具
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb
        框架提供了强大的控制台工具集，用于创建美观的命令行界面、处理用户输入、输出格式化信息等。
      </p>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          导入模块
        </h3>
        <CodeBlock code={importCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      {/* Command 类 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          Command 类
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            Command
          </code>{" "}
          类用于创建命令行命令，支持选项、参数和子命令：
        </p>
        <CodeBlock code={commandCode} language="typescript" />
      </section>

      {/* 进度条 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          进度条
        </h2>
        <CodeBlock code={progressCode} language="typescript" />
      </section>

      {/* 文档导航 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          文档导航
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          核心模块
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/console/ansi"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ANSI 颜色和格式化工具
            </a>{" "}
            - 颜色、样式、光标控制
          </li>
          <li>
            <a
              href="/docs/console/output"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              命令行输出工具
            </a>{" "}
            - 消息输出、格式化输出
          </li>
          <li>
            <a
              href="/docs/console/command"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              命令行命令封装类
            </a>{" "}
            - Command 类、选项、参数、子命令
          </li>
          <li>
            <a
              href="/docs/console/prompt"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              命令行输入工具
            </a>{" "}
            - 用户输入、确认、选择、交互式菜单
          </li>
          <li>
            <a
              href="/docs/console/table"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              表格输出工具
            </a>{" "}
            - 表格、键值对表格、进度条
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          其他
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/console/examples"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              完整示例
            </a>{" "}
            - 实际使用示例
          </li>
          <li>
            <a
              href="/docs/console/api"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              API 参考
            </a>{" "}
            - 完整 API 文档
          </li>
          <li>
            <a
              href="/docs/console/best-practices"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              最佳实践
            </a>{" "}
            - 使用建议和注意事项
          </li>
        </ul>
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
              href="/docs/extensions"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              扩展系统
            </a>{" "}
            - 扩展系统
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
        </ul>
      </section>
    </article>
  );
}

/**
 * 扩展模块 - 控制台工具文档页面
 * 展示 DWeb 框架的控制台工具功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
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
} from "@dreamer/dweb";`;

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
  const commandCode = `import { Command } from "@dreamer/dweb";

// 创建命令
const cmd = new Command("my-command")
  .description("这是一个示例命令")
  .option("-p, --port <port>", "端口号", "3000")
  .option("-h, --host <host>", "主机地址", "localhost")
  .action(async (options) => {
    console.log(\`服务器运行在 \${options.host}:\${options.port}\`);
  });

// 执行命令
await cmd.execute();`;

  // keepAlive 示例
  const keepAliveCode = `import { Command } from "@dreamer/dweb";

// 创建需要长时间运行的服务命令
const cmd = new Command("dev", "启动开发服务器")
  .keepAlive()  // 保持进程运行，不自动退出
  .option("-p, --port <port>", "端口号", "3000")
  .action(async (args, options) => {
    // 启动开发服务器
    await startDevServer(options.port);
    // 命令执行完成后，进程不会退出，服务器会继续运行
  });

await cmd.execute();`;

  // 进度条示例
  const progressCode = `import { progressBar } from "@dreamer/dweb";

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "控制台工具",
    description:
      "DWeb 框架提供了强大的控制台工具集，用于创建美观的命令行界面、处理用户输入、输出格式化信息等。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "导入模块",
            blocks: [
              {
                type: "code",
                code: importCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "基本使用",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "Command 类",
        blocks: [
          {
            type: "text",
            content: "`Command` 类用于创建命令行命令，支持选项、参数和子命令：",
          },
          {
            type: "code",
            code: commandCode,
            language: "typescript",
          },
          {
            type: "subsection",
            level: 3,
            title: "保持进程运行 (keepAlive)",
            blocks: [
              {
                type: "text",
                content:
                  "使用 `keepAlive()` 方法可以保持进程运行，防止命令执行完成后自动退出。这对于需要长时间运行的服务（如开发服务器、WebSocket 服务器等）非常有用。",
              },
              {
                type: "alert",
                level: "info",
                content: [
                  "**说明：**默认情况下，命令执行完成后会自动调用 `Deno.exit(0)` 退出进程。调用 `keepAlive()` 后，命令执行完成不会退出，进程会继续运行。",
                ],
              },
              {
                type: "code",
                code: keepAliveCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "进度条",
        blocks: [
          {
            type: "code",
            code: progressCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "文档导航",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "核心模块",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "[ANSI 颜色和格式化工具](/docs/console/ansi) - 颜色、样式、光标控制",
                  "[命令行输出工具](/docs/console/output) - 消息输出、格式化输出",
                  "[命令行命令封装类](/docs/console/command) - Command 类、选项、参数、子命令",
                  "[命令行输入工具](/docs/console/prompt) - 用户输入、确认、选择、交互式菜单",
                  "[表格输出工具](/docs/console/table) - 表格、键值对表格、进度条",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "其他",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "[完整示例](/docs/console/examples) - 实际使用示例",
                  "[API 参考](/docs/console/api) - 完整 API 文档",
                  "[最佳实践](/docs/console/best-practices) - 使用建议和注意事项",
                ],
              },
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
              "[核心模块](/docs/core/application) - 框架核心功能",
              "[扩展系统](/docs/extensions) - 扩展系统",
              "[中间件](/docs/middleware) - 中间件系统",
              "[插件](/docs/plugins) - 插件系统",
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

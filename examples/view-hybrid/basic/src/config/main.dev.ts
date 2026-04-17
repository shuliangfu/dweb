/**
 * 开发环境配置
 * 覆盖默认配置中的开发环境特定设置
 */

import type { AppConfig } from "@dreamer/dweb";
import { MemoryQueueAdapter } from "@dreamer/queue";
import { queuePlugin } from "@dreamer/plugins/queue";
import { scheduledPlugin } from "@dreamer/plugins/scheduled";

const config: AppConfig = {
  hotReload: true,
  server: {
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  render: { debug: false },
  router: { debug: false },

  build: {
    client: { debug: false },
    server: { debug: false },
  },
  // 实时通信：type 为 websocket 时挂载到当前 HTTP 服务器同一端口（开发环境测试）
  socket: {
    adapter: "websocket",
    path: "/ws",
    debug: false, // 开启后通过 logger.debug 输出 WebSocket 请求路径、握手等调试信息
  },

  /**
   * 仅开发环境插件示例：
   * - `scheduledPlugin`：`onStart` 注册 Cron，`onStop` 关闭。
   * - `queuePlugin`：`@dreamer/queue` 内存适配器 + 示例队列；容器内可取 `queueManager` 投递任务。
   * Cron 秒级表达式为 6 段：`秒 分 时 日 月 星期`。`inheritIo: true` 时子进程日志直接打到当前终端。
   */
  plugins: [
    scheduledPlugin(
      [
        {
          name: "scheduled-deno-eval",
          cron: "*/40 * * * * *",
          command: [
            "deno",
            "eval",
            `console.log("[view-hybrid-basic][scheduled-command] deno eval " + new Date().toISOString());`,
          ],
          inheritIo: true,
        },
        {
          name: "scheduled-sample-script",
          cron: "20 * * * * *",
          script: "./src/scripts/scheduled-sample.ts",
          inheritIo: true,
        },
      ],
      {
        level: "debug",
        format: "text",
      },
    ),
    queuePlugin(
      {
        managerName: "dev",
        manager: {
          adapter: new MemoryQueueAdapter(),
          /** 开发示例关闭自动恢复轮询，减少后台噪音 */
          autoRecover: false,
        },
        queues: [
          {
            name: "sample",
            options: { concurrency: 1 },
            /**
             * 消费示例：有任务时打日志；业务可在路由/load 中通过
             * `container.get("queueManager:dev")`（或 `QueueManager.fromContainer(c, "dev")`）
             * 取队列并 `add`。
             */
            process: (job) => {
              console.log(
                `[view-hybrid-basic][queue:sample] job=${job.name} id=${job.id} data=`,
                job.data,
              );
              return Promise.resolve();
            },
          },
        ],
      },
      {
        level: "debug",
        format: "text",
      },
    ),
  ],
};

export default config;

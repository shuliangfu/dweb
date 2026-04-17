/**
 * @fileoverview 手动向本示例「已启动」的开发服务投递一条 `sample` 队列任务。
 *
 * 说明：队列使用内存适配器，任务必须在**同一进程**内投递，故通过 HTTP 调用
 * `/api/dev/queue-sample`（见 `src/routes/api/dev/queue-sample.ts`），而非单独进程直连队列。
 *
 * @example
 * ```bash
 * # 终端 1：启动应用（会加载 main.dev 中的 queuePlugin）
 * deno task dev
 *
 * # 终端 2：投递任务（默认连接 127.0.0.1:3012，与 config/main.ts 默认端口一致）
 * deno task enqueue-queue
 *
 * # 自定义消息与任务名（端口写死在脚本内，与默认配置不一致时请改 `DEV_SERVER_PORT`）
 * deno run -A src/scripts/enqueue-queue-sample.ts -- --message "hello" --job-name my-job
 * ```
 */

/**
 * 解析简单 CLI 参数：支持 `--key=value` 与 `--key value`（下一项不以 `--` 开头则为值）
 *
 * @param argv 一般为 `Deno.args`
 * @returns 键值表
 */
function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    if (a.includes("=")) {
      const eq = a.indexOf("=");
      const key = a.slice(2, eq);
      out[key] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next != null && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

/** 与本示例 `src/config/main.ts` 默认 `server.port` 一致；若你用 `PORT` 起了别的端口，请改此常量 */
const DEV_SERVER_PORT = 3012;

/**
 * 脚本入口：POST JSON 到本机 API，成功则打印响应并退出码 0
 */
async function main(): Promise<void> {
  const args = parseArgs(Deno.args);
  const port = DEV_SERVER_PORT;
  const message = args.message ??
    `manual enqueue at ${new Date().toISOString()}`;
  const jobName = args["job-name"] ?? "manual-smoke";

  const url = `http://127.0.0.1:${port}/api/dev/queue-sample`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, jobName }),
  });
  const text = await res.text();
  console.log(`[enqueue-queue-sample] HTTP ${res.status} ${text}`);
  if (!res.ok) {
    Deno.exit(1);
  }
}

await main();

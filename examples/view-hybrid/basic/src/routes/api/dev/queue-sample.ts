/**
 * @fileoverview 开发联调：向 `main.dev.ts` 中 `queuePlugin` 所建 `sample` 队列投递任务。
 * 依赖 `main.ts` 中 `setQueueDevContainer` 注入容器；仅在使用含队列插件的开发配置时可用。
 */

import { QueueManager } from "@dreamer/queue";
import { json } from "@dreamer/router";

import { getQueueDevContainer } from "../../../queue-dev-container.ts";

/** 与 `main.dev.ts` 中 `queuePlugin` 的 `managerName` 一致 */
const MANAGER_NAME = "dev";
/** 与 `main.dev.ts` 中队列条目 `name: "sample"` 一致 */
const QUEUE_NAME = "sample";

/**
 * GET：说明本接口用途与 POST 请求体格式
 */
export function GET() {
  return json({
    ok: true,
    path: "/api/dev/queue-sample",
    usage:
      "POST application/json，可选字段 message（字符串）、jobName（任务名，默认 manual-smoke）；成功时 HTTP 202（已入队，消费异步进行）",
  });
}

/**
 * POST：向 `sample` 队列添加一条任务，随后由 `main.dev.ts` 中配置的 `process` 消费并打印日志
 */
export async function POST(request: Request) {
  const container = getQueueDevContainer();
  const serviceKey = `queueManager:${MANAGER_NAME}`;
  if (!container?.has(serviceKey)) {
    return json(
      {
        ok: false,
        error: "queue_unavailable",
        detail:
          "未找到队列管理器：请使用含 queuePlugin 的开发配置（如 main.dev）并已完成应用启动",
      },
      503,
    );
  }

  let body: { message?: string; jobName?: string } = {};
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("json") && request.body) {
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
  }

  const mgr = QueueManager.fromContainer(container, MANAGER_NAME);
  const queue = mgr.getQueue(QUEUE_NAME);
  if (!queue) {
    return json(
      { ok: false, error: "queue_not_found", queue: QUEUE_NAME },
      404,
    );
  }

  const jobName = (body.jobName?.trim() || "manual-smoke") as string;
  const data = {
    message: body.message ?? "",
    at: new Date().toISOString(),
  };
  const job = await queue.add(jobName, data);
  return json({
    ok: true,
    job: { id: job.id, name: job.name },
  });
}

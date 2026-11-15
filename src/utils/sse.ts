/**
 * 文件路由 SSE 响应：返回 `text/event-stream`，由服务端按事件向客户端推送。
 *
 * 压缩中间件已跳过该 Content-Type，不会把长连接整段读进内存再压缩。
 */
const encoder = new TextEncoder();

/** SSE 响应的 Content-Type */
export const SSE_CONTENT_TYPE = "text/event-stream; charset=utf-8";

/** 推送到已打开的 SSE 连接 */
export interface SsePush {
  /**
   * 发送一条事件。`data` 为非字符串时会 `JSON.stringify`；
   * 多行文本会拆成多条 `data:` 行。
   *
   * @param data 事件数据
   * @param event 事件名（对应 `EventSource` 的 `addEventListener(event, …)`）
   * @param id 可选事件 id（供浏览器重连时带上 `Last-Event-ID`）
   */
  send(data: unknown, event?: string, id?: string): void;
  /** 发送注释行（客户端会忽略），常用于心跳 */
  comment(text?: string): void;
  /** 发送 `:ping` 心跳 */
  ping(): void;
  /** 关闭连接 */
  close(): void;
}

/** {@link sse} 的可选参数 */
export interface SseOptions {
  /** 写入 `retry:`，单位毫秒，供浏览器断线重连 */
  retry?: number;
  /** 自动心跳间隔（毫秒）；不设则不自动心跳 */
  pingInterval?: number;
  /** 客户端断开时关闭流；不传则尝试从 `ctx.req` / `ctx.request` 读取 */
  signal?: AbortSignal;
  /** 额外响应头（会与默认 SSE 头合并，后者可被覆盖） */
  headers?: HeadersInit;
  /** HTTP 状态码，默认 200 */
  status?: number;
}

/** 带有 Request 的上下文（文件路由 `ApiContext` 或原始 `Request`） */
export type SseContext = Request | {
  req?: Request;
  request?: Request;
};

/**
 * 把一条 SSE 事件格式化成协议文本（以空行结束）。
 *
 * @param data 事件数据
 * @param event 事件名
 * @param id 事件 id
 */
export function formatSseMessage(
  data?: unknown,
  event?: string,
  id?: string,
): string {
  let out = "";
  if (id !== undefined && id !== "") {
    out += `id: ${stripLineBreaks(id)}\n`;
  }
  if (event) {
    out += `event: ${stripLineBreaks(event)}\n`;
  }
  if (data !== undefined) {
    const text = typeof data === "string" ? data : JSON.stringify(data);
    for (const line of text.split(/\r?\n/)) {
      out += `data: ${line}\n`;
    }
  }
  return `${out}\n`;
}

function stripLineBreaks(value: string): string {
  return value.replace(/\r?\n/g, "");
}

function requestFrom(ctx: SseContext): Request | undefined {
  if (ctx instanceof Request) return ctx;
  return ctx.req ?? ctx.request;
}

/**
 * 创建 SSE 响应，供文件路由 `GET` / `POST` 等 handler 直接返回。
 *
 * @param ctx `ApiContext` 或 `Request`（用于监听客户端断开）
 * @param start 连接建立后的回调；可返回清理函数
 * @param options 重连间隔、心跳、自定义头等
 * @returns `text/event-stream` 响应，body 为持续写入的流
 *
 * @example
 * ```ts
 * import type { ApiContext } from "@dreamer/dweb";
 * import { sse } from "@dreamer/dweb";
 *
 * export function GET(ctx: ApiContext) {
 *   return sse(ctx, (push) => {
 *     push.send({ time: Date.now() }, "tick");
 *     const timer = setInterval(() => {
 *       push.send({ time: Date.now() }, "tick");
 *     }, 1000);
 *     return () => clearInterval(timer);
 *   }, { retry: 3000, pingInterval: 15_000 });
 * }
 * ```
 */
export function sse(
  ctx: SseContext,
  start: (
    push: SsePush,
  ) => void | Promise<void> | (() => void) | Promise<() => void>,
  options: SseOptions = {},
): Response {
  const signal = options.signal ?? requestFrom(ctx)?.signal;
  let closeStream: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setInterval> | undefined;
      let cleanup: (() => void) | undefined;

      const write = (chunk: string): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          return false;
        }
      };

      const close = (): void => {
        if (closed) return;
        closed = true;
        if (timer !== undefined) {
          clearInterval(timer);
          timer = undefined;
        }
        if (signal) {
          signal.removeEventListener("abort", close);
        }
        try {
          cleanup?.();
        } catch {
          /* 忽略清理错误 */
        }
        cleanup = undefined;
        try {
          controller.close();
        } catch {
          /* 已关闭 */
        }
      };
      closeStream = close;

      const push: SsePush = {
        send(data, event, id) {
          if (!write(formatSseMessage(data, event, id))) close();
        },
        comment(text = "") {
          if (!write(`:${text}\n\n`)) close();
        },
        ping() {
          if (!write(":ping\n\n")) close();
        },
        close,
      };

      const retry = options.retry;
      if (retry != null && Number.isFinite(retry) && retry >= 0) {
        write(`retry: ${Math.floor(retry)}\n\n`);
      }

      if (options.pingInterval != null && options.pingInterval > 0) {
        timer = setInterval(() => {
          push.ping();
        }, options.pingInterval);
      }

      if (signal) {
        if (signal.aborted) {
          close();
          return;
        }
        signal.addEventListener("abort", close, { once: true });
      }

      try {
        const result = start(push);
        if (
          result != null &&
          typeof (result as Promise<unknown>).then === "function"
        ) {
          void Promise.resolve(result).then((maybeCleanup) => {
            if (closed) {
              if (typeof maybeCleanup === "function") {
                try {
                  maybeCleanup();
                } catch {
                  /* 忽略清理错误 */
                }
              }
              return;
            }
            if (typeof maybeCleanup === "function") cleanup = maybeCleanup;
          }).catch(() => close());
        } else if (typeof result === "function") {
          cleanup = result;
        }
      } catch {
        close();
      }
    },
    cancel() {
      closeStream?.();
    },
  });

  const headers = new Headers({
    "Content-Type": SSE_CONTENT_TYPE,
    "Cache-Control": "no-store",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return new Response(stream, {
    status: options.status ?? 200,
    headers,
  });
}

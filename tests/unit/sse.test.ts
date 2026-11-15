/**
 * 文件路由 SSE 辅助方法
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  formatSseMessage,
  sse,
  SSE_CONTENT_TYPE,
} from "../../src/utils/sse.ts";

describe("formatSseMessage", () => {
  it("应格式化事件名、数据、id，并把对象编成 JSON", () => {
    expect(formatSseMessage("1.0.0", "version")).toBe(
      "event: version\ndata: 1.0.0\n\n",
    );
    expect(formatSseMessage({ time: 1 }, "tick", "7")).toBe(
      'id: 7\nevent: tick\ndata: {"time":1}\n\n',
    );
  });

  it("多行文本应拆成多条 data 行", () => {
    expect(formatSseMessage("a\nb", "msg")).toBe(
      "event: msg\ndata: a\ndata: b\n\n",
    );
  });
});

describe("sse", () => {
  it("应返回 event-stream 响应，并写入 retry、事件与心跳", async () => {
    const response = sse(new Request("http://localhost/ticks"), (push) => {
      push.send("1.0.0", "version");
      push.ping();
      push.close();
    }, { retry: 3000 });
    expect(response.headers.get("Content-Type")).toBe(SSE_CONTENT_TYPE);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Connection")).toBe("keep-alive");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
    const text = await response.text();
    expect(text).toBe(
      "retry: 3000\n\nevent: version\ndata: 1.0.0\n\n:ping\n\n",
    );
  });

  it("客户端断开时应关闭流并执行清理函数", async () => {
    const abort = new AbortController();
    let cleaned = false;
    const response = sse(
      new Request("http://localhost/ticks", { signal: abort.signal }),
      (push) => {
        push.send("ok", "ready");
        return () => {
          cleaned = true;
        };
      },
    );
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
    abort.abort();
    const rest = await reader.read();
    expect(rest.done).toBe(true);
    expect(cleaned).toBe(true);
  });
});

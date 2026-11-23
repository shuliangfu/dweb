/**
 * 早期请求防护与限流键
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import type { HttpContext } from "@dreamer/server";
import {
  contentEncodingIncludesBr,
  defaultClientKey,
  rejectAmbiguousBodyFraming,
  rejectBrotliRequest,
} from "../../src/core/request-guards.ts";

function ctxFrom(request: Request): HttpContext {
  const url = new URL(request.url);
  return {
    request,
    path: url.pathname,
    method: request.method,
    url,
    headers: request.headers,
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
      getAll: () => ({}),
    },
  } as HttpContext;
}

describe("request-guards", () => {
  it("contentEncodingIncludesBr", () => {
    expect(contentEncodingIncludesBr(null)).toBe(false);
    expect(contentEncodingIncludesBr("gzip, br")).toBe(true);
    expect(contentEncodingIncludesBr("BR")).toBe(true);
    expect(contentEncodingIncludesBr("gzip")).toBe(false);
  });

  it("默认拒绝入站 br，415", async () => {
    const mw = rejectBrotliRequest();
    const ctx = ctxFrom(
      new Request("http://localhost/x", {
        method: "POST",
        headers: { "Content-Encoding": "br" },
      }),
    );
    let next = false;
    await mw(ctx, async () => {
      next = true;
    });
    expect(next).toBe(false);
    expect(ctx.response?.status).toBe(415);
  });

  it("allowBrotliRequestEncoding 时放行", async () => {
    const mw = rejectBrotliRequest(true);
    const ctx = ctxFrom(
      new Request("http://localhost/x", {
        method: "POST",
        headers: { "Content-Encoding": "br" },
      }),
    );
    let next = false;
    await mw(ctx, async () => {
      next = true;
    });
    expect(next).toBe(true);
  });

  it("同时存在 Content-Length 与 Transfer-Encoding 时 400", async () => {
    const mw = rejectAmbiguousBodyFraming();
    const ctx = ctxFrom(
      new Request("http://localhost/x", {
        method: "POST",
        headers: {
          "Content-Length": "0",
          "Transfer-Encoding": "chunked",
        },
      }),
    );
    let next = false;
    await mw(ctx, async () => {
      next = true;
    });
    expect(next).toBe(false);
    expect(ctx.response?.status).toBe(400);
  });

  it("defaultClientKey 默认忽略转发头且不用 Host", () => {
    const ctx = ctxFrom(
      new Request("http://evil.example/x", {
        headers: { "X-Forwarded-For": "9.9.9.9" },
      }),
    );
    expect(defaultClientKey(ctx, false)).toBe("unknown");
    expect(defaultClientKey(ctx, true)).toBe("9.9.9.9");
  });
});

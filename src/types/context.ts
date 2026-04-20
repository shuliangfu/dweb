/**
 * 路由上下文类型定义
 *
 * 供 metadata、load、API 等路由方法使用，由框架在调用时注入。
 *
 * @module
 */

import type { HttpContext } from "@dreamer/server";
import type { SessionData } from "@dreamer/session";

/**
 * 服务端响应辅助对象
 * 由框架注入到 LoadContext.res / ApiContext.res，用于在 load() 中统一生成各类响应（含服务端跳转）。
 * 所有方法返回标准 Response，可直接 return 给框架使用。
 */
export interface ServerResponse {
  /**
   * 服务端跳转，返回 302/301/307 等重定向 Response
   * @param url 目标 URL（相对路径或绝对 URL）
   * @param status 状态码，默认 302；301 永久、307 临时保方法
   */
  redirect(url: string, status?: number): Response;
  /**
   * 返回 JSON 响应（Content-Type: application/json）。
   * 将业务载荷 `data` 统一封装为 `{ success, data }`：
   * - `success`：由 `init.status` 推断（默认 `200`）；**2xx** 为 `true`，否则为 `false`。
   * - `data`：第一参传入的对象或其它可序列化值；未传时为 `null`。
   *
   * 行为与 `@dreamer/server` 的 {@link createServerResponse} 中 `json` 一致。
   */
  json(data: unknown, init?: ResponseInit): Response;
  /**
   * 返回 HTML 响应（Content-Type: text/html; charset=utf-8）
   */
  html(body: string, init?: ResponseInit): Response;
  /**
   * 返回纯文本响应（Content-Type: text/plain; charset=utf-8）
   */
  text(body: string, init?: ResponseInit): Response;
  /**
   * 返回二进制数据响应（Content-Type 默认 application/octet-stream，可通过 init.headers 覆盖）
   */
  binary(data: Uint8Array | ArrayBuffer, init?: ResponseInit): Response;
  /**
   * 返回任意 body 与 init 的 Response（用于流、Blob、自定义 Content-Type 等）
   */
  body(
    body: string | ReadableStream<Uint8Array> | Blob | ArrayBuffer | null,
    init?: ResponseInit,
  ): Response;
  /**
   * 仅设置状态码（无 body），可选自定义 statusText
   */
  status(code: number, statusText?: string): Response;
}

/**
 * metadata 方法接收的上下文
 * 仅包含与生成 meta 相关的字段，用于服务端生成 title/description 等
 */
export interface MetaContext {
  /** 当前请求 URL（完整或 pathname+search） */
  url: string;
  /** 路由参数（如 [id] 解析后的键值） */
  params: Record<string, string>;
  /** 查询参数（从 URL search 解析的键值对） */
  query: Record<string, string>;
}

/**
 * load() 收到的上下文：使用 **`req` / `res`**，与 `@dreamer/server` 文件路由 API 一致。
 */
export interface LoadContext {
  /** 当前请求 URL（完整或 pathname+search） */
  url: string;
  /** 路由参数（如 [id] 解析后的键值） */
  params: Record<string, string>;
  /** 查询参数（从 URL search 解析的键值对） */
  query: Record<string, string>;
  /** 原始 Web 标准 Request */
  req: Request;
  /**
   * 响应辅助（由框架注入）：redirect、json、html 等；
   * 部分场景（如仅序列化 JSON 的 load-data）可能未注入。
   */
  res?: ServerResponse;
  /** 请求方法（GET、POST、PUT、DELETE 等） */
  method: string;
  /** 解析后的 Cookie 键值对（来自 Cookie 头） */
  cookies: Record<string, string>;
  /** 请求头（与 `req.headers` 相同引用） */
  headers: Headers;
  /**
   * 会话数据（由 @dreamer/session 中间件注入；config.session 未启用时为 undefined）
   */
  session?: SessionData;
  /** 允许扩展，与 @dreamer/render LoadContext 兼容 */
  [key: string]: unknown;
}

/**
 * 文件路由 API 处理器参数类型：与 `@dreamer/server` 的 {@link ApiRouteContext} 同源。
 *
 * - **页面 `load(ctx)`** 使用本文件的 {@link LoadContext}（`res` 在部分场景可选）。
 * - **文件路由 `export async function foo(ctx)`** 使用本别名，与 RouterAdapter 注入的上下文一致（`res` 必填）。
 *
 * 字段命名统一为 `req` / `res`，避免与历史 `request` / `response` 混用。
 */
export type { ApiContext, ApiRouteContext } from "@dreamer/server";

/**
 * 判断是否为可用的 Web {@link Request}。
 * 在 Bun 等运行时中，跨 realm 的 `instanceof Request` 可能为 false，故用 duck typing。
 *
 * @param req - 待检测值
 */
function isUsableWebRequest(req: unknown): req is Request {
  if (req == null || typeof req !== "object") return false;
  const r = req as Partial<Request>;
  return typeof r.method === "string" && typeof r.headers?.get === "function";
}

/**
 * 当未传入有效 `req` 时，用 `url` 合成最小 `Request`（默认 GET），供 {@link createLoadContext} 使用。
 *
 * @param url - 完整 URL 或以 `/` 开头的路径
 */
function syntheticRequestForLoad(url: string): Request {
  const urlStr = (url ?? "").trim() || "/";
  const href = urlStr.startsWith("http://") || urlStr.startsWith("https://")
    ? urlStr
    : `http://127.0.0.1${urlStr.startsWith("/") ? urlStr : `/${urlStr}`}`;
  return new Request(href, { method: "GET", headers: new Headers() });
}

/**
 * 从 Request 的 Cookie 头解析出键值对
 * 用于在构建 LoadContext / ApiContext 时填充 cookies 字段
 *
 * @param request 请求对象
 * @returns Cookie 名到值的映射，重复键时保留最后一个值
 */
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader || !cookieHeader.trim()) {
    return {};
  }
  const out: Record<string, string> = {};
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (name) out[name] = value;
  }
  return out;
}

/**
 * 从 {@link HttpContext} 得到供 `load()` 使用的标准 `Request`。
 *
 * 正常由 `@dreamer/server` 创建上下文时注入 `ctx.request`；在部分运行环境
 * （如部分 Bun 链路上）该字段可能未挂上，但同对象上通常已有 `url` / `path` / `method` /
 * `headers`，此时用其合成最小 `Request`，避免 `createLoadContext` 读 `req.method` 抛错。
 * 同时兼容历史别名字段 `req`（与部分 Node 风格中间件命名一致）。
 *
 * @param ctx HTTP 请求上下文
 * @returns Web 标准 Request
 */
export function requestFromHttpContext(ctx: HttpContext): Request {
  const legacy = ctx as unknown as { req?: Request };
  const direct = ctx.request ?? legacy.req;
  if (isUsableWebRequest(direct)) {
    return direct;
  }
  const pathname = ctx.path ?? "/";
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const href = ctx.url?.href ?? `http://127.0.0.1${safePath}`;
  const rawHdrs = ctx.headers;
  const hdrs = rawHdrs != null && typeof (rawHdrs as Headers).get === "function"
    ? (rawHdrs as Headers)
    : new Headers();
  return new Request(href, {
    method: (ctx.method ?? "GET").toUpperCase(),
    headers: hdrs,
  });
}

/**
 * 构建 {@link LoadContext}（供框架在调用 `load()` 时注入）
 *
 * 文件路由 API 的上下文由 `@dreamer/server` 的 `buildApiRouteContext` 构造，类型为 {@link ApiContext}。
 *
 * @param options url、params、query、req（可缺省，将按 url 合成）及可选 session、res
 */
export function createLoadContext(options: {
  req?: Request;
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
  session?: SessionData;
  res?: ServerResponse;
}): LoadContext {
  const req = isUsableWebRequest(options.req)
    ? options.req
    : syntheticRequestForLoad(options.url);
  return {
    url: options.url,
    params: options.params,
    query: options.query,
    req,
    res: options.res,
    method: req.method,
    cookies: parseCookies(req),
    headers: req.headers,
    session: options.session,
  };
}

/**
 * 构建 MetaContext
 * 供框架在解析 metadata 方法时使用
 *
 * @param options url、params、query
 * @returns MetaContext
 */
export function createMetaContext(options: {
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
}): MetaContext {
  return {
    url: options.url,
    params: options.params,
    query: options.query,
  };
}

/** 默认 JSON 响应头 */
const JSON_HEADERS = new Headers({
  "Content-Type": "application/json; charset=utf-8",
});
/** 默认 HTML 响应头 */
const HTML_HEADERS = new Headers({
  "Content-Type": "text/html; charset=utf-8",
});
/** 默认文本响应头 */
const TEXT_HEADERS = new Headers({
  "Content-Type": "text/plain; charset=utf-8",
});
/** 默认二进制响应头 */
const BINARY_HEADERS = new Headers({
  "Content-Type": "application/octet-stream",
});

/**
 * 创建服务端响应辅助对象
 * 供框架在构建 LoadContext 时注入，使 load() 可统一使用 redirect、json、html 等
 *
 * @returns ServerResponse 实例，所有方法返回标准 Web Response
 */
export function createServerResponse(): ServerResponse {
  return {
    redirect(url: string, status = 302): Response {
      return new Response(null, {
        status,
        headers: new Headers({ Location: url }),
      });
    },
    json(data: unknown, init?: ResponseInit): Response {
      // HTTP 状态码决定 success；业务载荷一律放在 data，与 @dreamer/server createServerResponse 保持一致
      const status = init?.status ?? 200;
      const success = status >= 200 && status < 300;
      const envelope = {
        success,
        data: data === undefined ? null : data,
      };
      const body = JSON.stringify(envelope);
      const headers = new Headers(init?.headers ?? JSON_HEADERS);
      return new Response(body, { ...init, headers });
    },
    html(body: string, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers ?? HTML_HEADERS);
      return new Response(body, { ...init, headers });
    },
    text(body: string, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers ?? TEXT_HEADERS);
      return new Response(body, { ...init, headers });
    },
    binary(data: Uint8Array | ArrayBuffer, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers ?? BINARY_HEADERS);
      return new Response(data as BodyInit, { ...init, headers });
    },
    body(
      body: string | ReadableStream<Uint8Array> | Blob | ArrayBuffer | null,
      init?: ResponseInit,
    ): Response {
      return new Response(body, init);
    },
    status(code: number, statusText?: string): Response {
      return new Response(null, { status: code, statusText });
    },
  };
}

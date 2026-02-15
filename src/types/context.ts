/**
 * 路由上下文类型定义
 *
 * 供 metadata、load、API 等路由方法使用，由框架在调用时注入。
 *
 * @module
 */

import type { SessionData } from "@dreamer/session";

/**
 * 服务端响应辅助对象
 * 由框架注入到 LoadContext.response / ApiContext.response，用于在 load() 或 API 中统一生成各类响应（含服务端跳转）。
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
   * 返回 JSON 响应（Content-Type: application/json）
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
 * load 方法接收的上下文
 * 包含完整请求信息，便于在服务端获取数据时使用 cookie、session、headers 等
 * 含 [key: string]: unknown 以与 @dreamer/render 的 LoadContext 兼容
 */
export interface LoadContext {
  /** 当前请求 URL（完整或 pathname+search） */
  url: string;
  /** 路由参数（如 [id] 解析后的键值） */
  params: Record<string, string>;
  /** 查询参数（从 URL search 解析的键值对） */
  query: Record<string, string>;
  /** 原始 Web 标准 Request 对象 */
  request: Request;
  /**
   * 响应辅助（由框架注入）：redirect、json、html、text、body、status 等，
   * 用于在 load() 中做服务端跳转或返回多种格式；部分场景如 load-data 仅返回 JSON 时可能未注入。
   */
  response?: ServerResponse;
  /** 请求方法（GET、POST、PUT、DELETE 等） */
  method: string;
  /** 解析后的 Cookie 键值对（来自 request 的 Cookie 头） */
  cookies: Record<string, string>;
  /** 请求头（Web 标准 Headers，只读） */
  headers: Headers;
  /**
   * 会话数据（由 @dreamer/session 中间件注入；config.session 未启用时为 undefined）
   */
  session?: SessionData;
  /** 允许扩展，与 @dreamer/render LoadContext 兼容 */
  [key: string]: unknown;
}

/**
 * API 路由处理器接收的上下文
 * 与 LoadContext 结构一致，便于在 api/* 路由中访问请求、cookie、session 等
 */
export type ApiContext = LoadContext;

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
 * 构建 LoadContext / ApiContext
 * 供框架在调用 load() 或 API 处理器时使用
 *
 * @param options url、params、query、request 及可选的 session、response
 * @returns 完整的 LoadContext
 */
export function createLoadContext(options: {
  request: Request;
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
  session?: SessionData;
  response?: ServerResponse;
}): LoadContext {
  return {
    url: options.url,
    params: options.params,
    query: options.query,
    request: options.request,
    response: options.response,
    method: options.request.method,
    cookies: parseCookies(options.request),
    headers: options.request.headers,
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
 * 供框架在构建 LoadContext 时注入，使 load() / API 可统一使用 redirect、json、html 等
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
      const body = JSON.stringify(data);
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

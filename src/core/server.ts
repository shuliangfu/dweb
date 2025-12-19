/**
 * 核心服务器模块
 * 基于 Deno 的 HTTP 服务器实现
 */

import type { CookieOptions, Middleware, Request, Response, Session } from '../types/index.ts';

/**
 * 服务器类
 */
export class Server {
  private middlewares: Middleware[] = [];
  private handler?: (req: Request, res: Response) => Promise<void> | void;
  private serverHandle?: {
    shutdown: () => Promise<void>;
    finished: Promise<void>;
  };

  /**
   * 添加中间件
   * @param middleware 中间件函数或中间件数组
   */
  use(middleware: Middleware | Middleware[]): void {
    if (Array.isArray(middleware)) {
      this.middlewares.push(...middleware);
    } else {
      this.middlewares.push(middleware);
    }
  }

  /**
   * 设置请求处理器
   * @param handler 请求处理函数
   */
  setHandler(handler: (req: Request, res: Response) => Promise<void> | void): void {
    this.handler = handler;
  }

  /**
   * 处理请求
   * @param nativeReq Deno 原生请求对象
   * @returns 响应对象
   */
  async handleRequest(nativeReq: globalThis.Request): Promise<globalThis.Response> {
    // 创建扩展的请求和响应对象
    const req = this.createRequest(nativeReq);
    const res = this.createResponse();

    try {
      // 执行中间件链和请求处理器
      // 中间件和处理器应该通过 handler 统一管理
      if (this.handler) {
        // 执行请求处理器
        await this.handler(req, res);
      } else {
        // 如果没有设置 handler，执行中间件链
        await this.runMiddlewares(req, res);
      }

      // 确保响应体已设置（在 handler 完成后检查）
      if (!res.body && res.status === 200) {
        res.status = 500;
        res.text('Internal Server Error: Empty response');
      }
    } catch (error) {
      // 错误处理
      res.status = 500;
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.text(`Internal Server Error: ${errorMessage}`);
    }

    // 返回响应
    const nativeRes = this.createNativeResponse(res);
    return nativeRes;
  }

  /**
   * 创建扩展的请求对象
   */
  private createRequest(nativeReq: globalThis.Request): Request {
    // 确保 URL 存在
    if (!nativeReq.url) {
      throw new Error('Request URL is required');
    }

    const url = new URL(nativeReq.url);

    // 解析查询参数
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // 解析 Cookie
    const cookies: Record<string, string> = {};
    const cookieHeader = nativeReq.headers.get('cookie');
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[name] = decodeURIComponent(value);
        }
      });
    }

    // 创建扩展属性对象
    const extensions = {
      params: {} as Record<string, string>,
      query,
      cookies,
      body: undefined as unknown, // 初始化为 undefined，body-parser 会设置
      session: null as Session | null,
      getCookie: (name: string) => cookies[name] || null,
      getHeader: (name: string) => nativeReq.headers.get(name),
      createSession: (_data?: Record<string, unknown>) => {
        // Session 创建逻辑将在 features/session.ts 中实现
        return Promise.reject(new Error('Session 功能未实现'));
      },
      getSession: () => {
        // Session 获取逻辑将在 features/session.ts 中实现
        return Promise.resolve(null);
      },
    };

    // 使用 Proxy 来代理请求对象，保留所有原生属性，同时添加扩展属性
    const extendedReq = new Proxy(nativeReq, {
      get(target, prop) {
        // 如果访问扩展属性，返回扩展属性
        if (prop in extensions) {
          return (extensions as Record<string | symbol, unknown>)[prop];
        }
        // 否则返回原生属性
        return (target as unknown as Record<string | symbol, unknown>)[prop];
      },
      set(target, prop, value) {
        // 如果设置扩展属性，设置到扩展对象
        if (prop in extensions) {
          (extensions as Record<string | symbol, unknown>)[prop] = value;
          return true;
        }
        // 否则尝试设置到原生对象（可能会失败，因为原生属性可能是只读的）
        try {
          (target as unknown as Record<string | symbol, unknown>)[prop] = value;
          return true;
        } catch {
          return false;
        }
      },
      has(target, prop) {
        return prop in extensions || prop in target;
      },
    }) as Request;

    return extendedReq;
  }

  /**
   * 创建响应对象
   */
  private createResponse(): Response {
    const headers = new Headers();
    const cookies: Array<{ name: string; value: string; options?: CookieOptions }> = [];
    let body: string | Uint8Array | undefined = undefined;
    let status = 200;
    let statusText = 'OK';

    const response: Response = {
      get status() {
        return status;
      },
      set status(value: number) {
        status = value;
      },
      get statusText() {
        return statusText;
      },
      set statusText(value: string) {
        statusText = value;
      },
      headers,
      get body() {
        return body;
      },
      set body(value: string | Uint8Array | undefined) {
        body = value;
      },
      setCookie(name: string, value: string, options?: CookieOptions) {
        cookies.push({ name, value, options });
      },
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
      json(data: unknown) {
        headers.set('content-type', 'application/json');
        body = JSON.stringify(data);
        return response;
      },
      html(html: string) {
        headers.set('content-type', 'text/html; charset=utf-8');
        // 直接设置闭包变量 body
        body = html;
        return response;
      },
      text(text: string) {
        // 如果已经设置了 Content-Type，不覆盖（例如 Tailwind CSS 插件设置的 text/css）
        if (!headers.has('content-type')) {
          headers.set('content-type', 'text/plain; charset=utf-8');
        }
        body = text;
        return response;
      },
      redirect(url: string, statusCode: number = 302) {
        status = statusCode;
        headers.set('location', url);
        return response;
      },
      send(data: unknown) {
        if (typeof data === 'string') {
          return response.text(data);
        }
        return response.json(data);
      },
    };

    return response;
  }

  /**
   * 执行中间件链
   */
  private async runMiddlewares(req: Request, res: Response): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(req, res, next);
      }
    };

    await next();
  }

  /**
   * 创建原生响应对象
   */
  private createNativeResponse(res: Response): globalThis.Response {
    // 处理 Cookie
    if (res.headers) {
      // Cookie 设置逻辑将在 features/cookie.ts 中实现
    }

    // 读取响应体（通过 getter）
    const responseBody = res.body;

    // 304 Not Modified 响应不应该有 body
    if (res.status === 304) {
      return new globalThis.Response(null, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    // 确保 body 不为 undefined，如果为空则使用空字符串
    const finalBody: string | Uint8Array | undefined = responseBody ?? '';

    // 调试：如果 body 为空但状态是 200，记录详细日志
    // 注意：此检查已在 handleRequest 中处理，这里保留用于未来扩展
    if (!finalBody && res.status === 200) {
      // 空响应体已在 handleRequest 中处理为 500 错误
    }

    // 如果 finalBody 是 Uint8Array，需要转换为 ArrayBuffer 或保持原样
    // Response 构造函数接受 string | ReadableStream | Blob | ArrayBuffer | FormData | URLSearchParams
    // Uint8Array 需要转换为 ArrayBuffer
    let bodyInit: BodyInit | null | undefined;
    if (finalBody instanceof Uint8Array) {
      // 创建一个新的 ArrayBuffer，避免共享缓冲区的问题
      bodyInit = finalBody.slice().buffer;
    } else {
      bodyInit = finalBody as BodyInit | null | undefined;
    }

    return new globalThis.Response(bodyInit, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }

  /**
   * 启动服务器
   * @param port 端口号
   * @param host 主机地址
   */
  async start(port: number, host: string): Promise<void> {
    const handler = async (req: globalThis.Request): Promise<globalThis.Response> => {
      try {
        // 确保请求有有效的 URL
        if (!req.url) {
          return new globalThis.Response('Invalid Request: Missing URL', {
            status: 400,
          });
        }
        return await this.handleRequest(req);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new globalThis.Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
      }
    };

    // 使用 Deno.serve 启动服务器
    // Deno.serve 返回一个包含 shutdown 方法的对象
    const serverHandle = Deno.serve({ port, hostname: host }, handler);
    this.serverHandle = {
      shutdown: () => serverHandle.shutdown(),
      finished: serverHandle.finished || Promise.resolve(),
    };

    // 等待服务器关闭
    await this.serverHandle.finished;
  }

  /**
   * 关闭服务器
   */
  async close(): Promise<void> {
    if (this.serverHandle) {
      await this.serverHandle.shutdown();
      this.serverHandle = undefined;
    }
  }
}

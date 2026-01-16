/**
 * 核心服务器模块
 * 基于 Deno 的 HTTP 服务器实现
 *
 * @module core/server
 */

import type {
  ContentType,
  CookieOptions,
  Middleware,
  Request,
  Response,
  Session,
} from "../common/types/index.ts";
import { DEFAULT_CERT, DEFAULT_KEY } from "./certs/dev-certs.ts";
import type { ErrorHandler } from "./error-handler.ts";
import type { IService } from "./iservice.ts";
import { success } from "../server/console/output.ts";

/**
 * HTTP 服务器类
 *
 * 提供基于 Deno 的 HTTP 服务器实现，支持中间件链和请求处理。
 *
 * @example
 * ```typescript
 * import { Server } from "@dreamer/dweb";
 *
 * const server = new Server();
 * server.setHandler(async (req, res) => {
 *   res.text("Hello World");
 * });
 * await server.start(3000, "localhost");
 * ```
 */
// Server 类实现了 IService 接口，但 start 方法的签名不同（需要参数）
// 因此使用类型断言来绕过类型检查
export class Server implements Omit<IService, "start"> {
  /** 服务名称 */
  public readonly name: string = "Server";

  private middlewares: Middleware[] = [];
  private handler?: (req: Request, res: Response) => Promise<void> | void;
  private wsUpgradeHandler?: (
    req: globalThis.Request,
  ) => globalThis.Response | null;
  private errorHandler?: ErrorHandler;
  private serverHandle?: {
    shutdown: () => Promise<void>;
  };

  /** 服务器是否正在运行（私有属性） */
  private _isRunning: boolean = false;

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
   *
   * 设置统一的请求处理函数。如果设置了处理器，将优先使用处理器而不是中间件链。
   *
   * @param handler - 请求处理函数，接收 Request 和 Response 对象
   *
   * @example
   * ```typescript
   * server.setHandler(async (req, res) => {
   *   res.text("Hello World");
   * });
   * ```
   */
  setHandler(
    handler: (req: Request, res: Response) => Promise<void> | void,
  ): void {
    this.handler = handler;
  }

  /**
   * 设置 WebSocket 升级处理器
   *
   * 设置用于处理 WebSocket 升级请求的函数。如果设置了此处理器，
   * 在处理请求之前会先检查是否为 WebSocket 升级请求。
   *
   * @param handler - WebSocket 升级处理函数，接收原生 Request 对象，返回升级响应或 null
   *
   * @example
   * ```typescript
   * server.setWebSocketUpgradeHandler((req) => {
   *   // 处理 WebSocket 升级
   *   return wsServer.handleUpgrade(req);
   * });
   * ```
   */
  setWebSocketUpgradeHandler(
    handler: (req: globalThis.Request) => globalThis.Response | null,
  ): void {
    this.wsUpgradeHandler = handler;
  }

  /**
   * 设置错误处理器
   * @param errorHandler - 错误处理器
   */
  setErrorHandler(errorHandler: ErrorHandler): void {
    this.errorHandler = errorHandler;
  }

  /**
   * 处理请求
   *
   * 将 Deno 原生请求转换为框架的 Request 对象，执行中间件链或处理器，然后返回响应。
   *
   * @param nativeReq - Deno 原生请求对象
   * @returns Promise<Response> - Deno 原生响应对象
   *
   * @example
   * ```typescript
   * const server = new Server();
   * // ... 配置服务器
   *
   * // 在 Deno.serve 中使用
   * Deno.serve({ port: 3000 }, server.handleRequest.bind(server));
   * ```
   */
  async handleRequest(
    nativeReq: globalThis.Request,
  ): Promise<globalThis.Response> {
    // 检查 WebSocket 升级请求
    if (this.wsUpgradeHandler) {
      const upgradeResponse = this.wsUpgradeHandler(nativeReq);
      if (upgradeResponse) {
        return upgradeResponse;
      }
    }

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
        await this.runMiddlewares(req, res, undefined);
      }

      // 确保响应体已设置（在 handler 完成后检查）
      if (!res.body && res.status === 200) {
        res.status = 500;
        res.text("Internal Server Error: Empty response");
      }
    } catch (error) {
      // 错误处理
      if (this.errorHandler) {
        try {
          await this.errorHandler.handle(error, req, res);
        } catch {
          // 如果错误处理器本身出错，降级到默认处理
          this.fallbackErrorHandler(res, error);
        }
      } else {
        this.fallbackErrorHandler(res, error);
      }
    }

    // 返回响应
    const nativeRes = this.createNativeResponse(res);
    return nativeRes;
  }

  /**
   * 降级错误处理
   */
  private fallbackErrorHandler(res: Response, error: unknown): void {
    if (res.headers.has("Content-Type") || res.body) {
      // 如果响应已经发送了一部分，无法更改
      return;
    }

    res.status = 500;
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.text(`Internal Server Error: ${errorMessage}`);
  }

  /**
   * 创建扩展的请求对象
   */
  private createRequest(nativeReq: globalThis.Request): Request {
    // 确保 URL 存在
    if (!nativeReq.url) {
      throw new Error("Request URL is required");
    }

    const url = new URL(nativeReq.url);

    // 解析查询参数
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // 解析 Cookie
    const cookies: Record<string, string> = {};
    const cookieHeader = nativeReq.headers.get("cookie");
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const [name, value] = cookie.trim().split("=");
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
        return Promise.reject(new Error("Session 功能未实现"));
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
    const cookies: Array<
      { name: string; value: string; options?: CookieOptions }
    > = [];
    let body: string | Uint8Array | ReadableStream<Uint8Array> | undefined =
      undefined;
    let status = 200;
    let statusText = "OK";

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
        return body as any;
      },
      set body(value: any) {
        body = value;
      },
      setCookie(name: string, value: string, options?: CookieOptions) {
        cookies.push({ name, value, options });
      },
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
      json(
        data: unknown,
        options?: {
          charset?: string;
          status?: number;
          headers?: Record<string, string>;
        },
      ) {
        // 设置状态码（如果指定）
        if (options?.status !== undefined) {
          status = options.status;
        }

        // 设置 Content-Type
        const charset = options?.charset || "utf-8";
        headers.set("content-type", `application/json; charset=${charset}`);

        // 设置自定义响应头
        if (options?.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            headers.set(key.toLowerCase(), value);
          }
        }

        body = JSON.stringify(data);
        return response;
      },
      html(
        html: string,
        options?: {
          charset?: string;
          status?: number;
          headers?: Record<string, string>;
        },
      ) {
        // 设置状态码（如果指定）
        if (options?.status !== undefined) {
          status = options.status;
        }

        // 设置 Content-Type
        const charset = options?.charset || "utf-8";
        headers.set("content-type", `text/html; charset=${charset}`);

        // 设置自定义响应头
        if (options?.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            headers.set(key.toLowerCase(), value);
          }
        }

        // 直接设置闭包变量 body
        body = html;
        return response;
      },
      text(
        text: string,
        options?: {
          type?: ContentType;
          charset?: string;
          status?: number;
          headers?: Record<string, string>;
        },
      ) {
        // 设置状态码（如果指定）
        if (options?.status !== undefined) {
          status = options.status;
        }

        // 类型映射表：将简写的类型名称映射到完整的 MIME 类型
        const typeMap: Record<string, string> = {
          html: "text/html",
          text: "text/plain",
          json: "application/json",
          javascript: "application/javascript",
          css: "text/css",
          xml: "application/xml",
          svg: "image/svg+xml",
          binary: "application/octet-stream",
        };

        // 设置 Content-Type
        if (options?.type) {
          // 根据 type 参数映射到对应的 MIME 类型
          const mimeType = typeMap[options.type] || "text/plain";
          const charset = options.charset || "utf-8";
          headers.set("content-type", `${mimeType}; charset=${charset}`);
        } else if (!headers.has("content-type")) {
          // 如果已经设置了 Content-Type，不覆盖（例如 Tailwind CSS 插件设置的 text/css）
          const charset = options?.charset || "utf-8";
          headers.set("content-type", `text/plain; charset=${charset}`);
        } else if (options?.charset) {
          // 如果已有 Content-Type 但指定了 charset，更新 charset
          const existingType = headers.get("content-type") || "";
          const typeWithoutCharset = existingType.split(";")[0].trim();
          headers.set(
            "content-type",
            `${typeWithoutCharset}; charset=${options.charset}`,
          );
        }

        // 设置自定义响应头
        if (options?.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            headers.set(key.toLowerCase(), value);
          }
        }

        body = text;
        return response;
      },
      send(
        data: unknown,
        options?: {
          type?: ContentType;
          charset?: string;
          status?: number;
          headers?: Record<string, string>;
        },
      ) {
        // 根据 type 参数决定调用哪个方法
        if (options?.type === "html") {
          return response.html(String(data), options);
        }

        // 明确指定 json 类型
        if (options?.type === "json") {
          // 对于对象，移除 type 选项（json 不需要 type）
          const jsonOptions = options
            ? {
              charset: options.charset,
              status: options.status,
              headers: options.headers,
            }
            : undefined;
          return response.json(data, jsonOptions);
        }

        // 处理字符串数据（默认返回 text）
        if (typeof data === "string") {
          // 如果指定了 type，使用指定的 type，否则默认为 'text'
          const textOptions = {
            ...options,
            type: options?.type || "text",
          };
          return response.text(data, textOptions);
        }

        // 处理 Uint8Array 二进制数据
        if (data instanceof Uint8Array) {
          // 如果指定了 type，使用指定的 type，否则默认为 'binary'
          const binaryOptions = {
            ...options,
            type: options?.type || "binary",
          };
          return response.text(new TextDecoder().decode(data), binaryOptions);
        }

        // 默认情况：对象也转换为字符串返回 text
        // 如果指定了 type，使用指定的 type，否则默认为 'text'
        const textOptions = {
          ...options,
          type: options?.type || "text",
        };
        return response.text(String(data), textOptions);
      },
      redirect(url: string, statusCode: number = 302) {
        status = statusCode;
        headers.set("location", url);
        return response;
      },
    };

    return response;
  }

  /**
   * 执行中间件链
   * @param app 应用上下文对象（可选，如果未提供则传入空对象）
   */
  private async runMiddlewares(
    req: Request,
    res: Response,
    app?: any,
  ): Promise<void> {
    const middlewares = this.middlewares;
    let index = 0;
    // 如果没有提供 app，创建一个空对象（满足类型要求）
    const appContext = app || ({} as any);

    /**
     * 检查响应是否已经设置（通过 body 或重定向状态码）
     * 如果响应已设置，说明中间件已经处理了请求，应该停止执行后续中间件
     */
    const isResponseSet = (res: Response): boolean => {
      // 检查是否有响应体
      if (res.body !== undefined) {
        return true;
      }
      // 检查是否是重定向（301 或 302 状态码，并且设置了 location header）
      if (
        (res.status === 301 || res.status === 302) &&
        res.headers.get("location")
      ) {
        return true;
      }
      return false;
    };

    const next = async (): Promise<void> => {
      // 如果响应已经设置（通过 res.json()、res.redirect() 等），停止执行后续中间件
      if (isResponseSet(res)) {
        return;
      }

      if (index >= middlewares.length) {
        return;
      }

      // 获取当前要执行的中间件索引
      const i = index;
      // 预先增加索引，以便下一次调用 next 时获取下一个中间件
      index++;

      const middleware = middlewares[i];

      // 防止在同一个中间件中多次调用 next()
      let nextCalled = false;
      const wrappedNext = async () => {
        if (nextCalled) {
          return;
        }
        nextCalled = true;
        await next();
      };

      try {
        await middleware(req, res, wrappedNext, appContext);

        // 中间件执行后再次检查响应是否已设置
        // 如果已设置，停止执行后续中间件
        if (isResponseSet(res)) {
          return;
        }
      } catch (error) {
        throw error;
      }
    };

    await next();
  }

  /**
   * 创建原生响应对象
   */
  private createNativeResponse(res: Response): globalThis.Response {
    // 处理 Cookie：将 cookies 数组转换为 Set-Cookie 头
    // 注意：需要处理多个 Set-Cookie 头，因为 Headers 对象不支持同名头
    // 所以需要将多个 Set-Cookie 头合并为一个，用逗号分隔（但这不是标准做法）
    // 实际上，HTTP/2 支持多个 Set-Cookie 头，但 HTTP/1.1 不支持
    // 这里我们使用 append 方法，但 Headers 对象可能不支持 append
    // 更好的方法是：在创建 Response 时，手动构建 headers 对象
    const finalHeaders = new Headers(res.headers);

    // 处理通过 setCookie() 方法设置的 cookies
    // 注意：cookies 数组是在 createResponse() 的闭包中定义的
    // 我们需要通过类型断言访问它
    const cookies = (res as any).__cookies as
      | Array<{
        name: string;
        value: string;
        options?: CookieOptions;
      }>
      | undefined;

    if (cookies && cookies.length > 0) {
      // 构建 cookie 字符串
      for (const cookie of cookies) {
        let cookieString = `${encodeURIComponent(cookie.name)}=${
          encodeURIComponent(cookie.value)
        }`;
        const opts = cookie.options || {};

        // 设置路径
        if (opts.path) {
          cookieString += `; Path=${opts.path}`;
        } else {
          cookieString += "; Path=/";
        }

        // 设置域名
        if (opts.domain) {
          cookieString += `; Domain=${opts.domain}`;
        }

        // 设置过期时间
        if (opts.expires) {
          cookieString += `; Expires=${opts.expires.toUTCString()}`;
        } else if (opts.maxAge) {
          cookieString += `; Max-Age=${opts.maxAge}`;
        }

        // 设置 Secure
        if (opts.secure) {
          cookieString += "; Secure";
        }

        // 设置 HttpOnly
        if (opts.httpOnly !== false) {
          cookieString += "; HttpOnly";
        }

        // 设置 SameSite
        if (opts.sameSite) {
          cookieString += `; SameSite=${opts.sameSite}`;
        }

        // 追加 Set-Cookie 头
        // 注意：HTTP/1.1 规范允许在响应中有多个 Set-Cookie 头
        // Deno 的 Headers 对象支持 append 方法，可以添加多个同名头
        finalHeaders.append("Set-Cookie", cookieString);
      }
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
    const finalBody:
      | string
      | Uint8Array
      | ReadableStream<Uint8Array>
      | undefined = responseBody ?? "";

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
      headers: finalHeaders,
    });
  }

  /**
   * 启动服务器
   * @param port 端口号
   * @param host 主机地址
   * @param tls TLS 配置（可选，用于启用 HTTPS）
   *   - `true`: 使用框架内置的默认证书（适用于开发环境）
   *   - 配置对象: 使用自定义证书和私钥
   */
  async start(
    port: number,
    host: string,
    tls?: boolean | {
      certFile?: string;
      keyFile?: string;
      cert?: Uint8Array;
      key?: Uint8Array;
    },
  ): Promise<void> {
    const handler = async (
      req: globalThis.Request,
    ): Promise<globalThis.Response> => {
      try {
        // 确保请求有有效的 URL
        if (!req.url) {
          return new globalThis.Response("Invalid Request: Missing URL", {
            status: 400,
          });
        }
        return await this.handleRequest(req);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        return new globalThis.Response(
          `Internal Server Error: ${errorMessage}`,
          { status: 500 },
        );
      }
    };

    const instanceIndex = Number(Deno.env.get("PUP_CLUSTER_INSTANCE") || 0);
    port += instanceIndex;

    // 准备 Deno.serve 配置
    const serveOptions: {
      port: number;
      hostname: string;
      onListen?: () => void;
      cert?: string;
      key?: string;
    } = {
      port,
      hostname: host,
      onListen: () => {
        const protocol = tls ? "https" : "http";
        success(`✅ 服务器已启动: ${protocol}://${host}:${port}`);
      },
    };

    // 如果配置了 TLS，添加证书和私钥
    if (tls) {
      let cert: string;
      let key: string;

      // 如果 tls 是 true，使用默认证书
      if (tls === true) {
        cert = DEFAULT_CERT;
        key = DEFAULT_KEY;
      } else {
        // 读取证书文件或使用提供的证书内容
        if (tls.certFile) {
          cert = await Deno.readTextFile(tls.certFile);
        } else if (tls.cert) {
          // 将 Uint8Array 转换为字符串
          cert = new TextDecoder().decode(tls.cert);
        } else {
          throw new Error("TLS 配置错误：必须提供 certFile 或 cert");
        }

        // 读取私钥文件或使用提供的私钥内容
        if (tls.keyFile) {
          key = await Deno.readTextFile(tls.keyFile);
        } else if (tls.key) {
          // 将 Uint8Array 转换为字符串
          key = new TextDecoder().decode(tls.key);
        } else {
          throw new Error("TLS 配置错误：必须提供 keyFile 或 key");
        }
      }

      serveOptions.cert = cert;
      serveOptions.key = key;
    }

    // 使用 Deno.serve 启动服务器
    // Deno.serve 返回一个包含 shutdown 方法的对象
    const serverHandle = Deno.serve(serveOptions, handler);
    this.serverHandle = {
      shutdown: () => serverHandle.shutdown(),
    };

    // 标记服务器为运行状态
    this._isRunning = true;
  }

  /**
   * 关闭服务器
   */
  close(): Promise<void> {
    if (this.serverHandle) {
      const handle = this.serverHandle;
      // 立即清理 serverHandle，避免后续操作引用它
      this.serverHandle = undefined;
      this._isRunning = false;

      // 尝试关闭服务器，但不等待它完成
      // 因为 shutdown() 可能会卡住，我们在后台执行它，立即返回
      // 在后台执行 shutdown，不阻塞当前流程
      (async () => {
        try {
          const shutdownPromise = handle.shutdown();
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("关闭服务器超时")), 1000);
          });

          await Promise.race([shutdownPromise, timeoutPromise]);
        } catch {
          // 忽略后台关闭错误
        }
      })();
    }
    // 方法立即返回，不等待任何异步操作
    return Promise.resolve();
  }

  /**
   * 获取服务名称（实现 IService 接口）
   */
  getName(): string {
    return this.name;
  }

  /**
   * 检查服务是否正在运行（实现 IService 接口）
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 销毁服务（实现 IService 接口）
   * 关闭服务器连接
   */
  // async destroy(): Promise<void> {
  //   await this.close();
  // }
}

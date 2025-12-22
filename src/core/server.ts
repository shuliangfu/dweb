/**
 * 核心服务器模块
 * 基于 Deno 的 HTTP 服务器实现
 *
 * @module core/server
 */

import type { ContentType, CookieOptions, Middleware, Request, Response, Session } from '../types/index.ts';

/**
 * 默认 TLS 证书（用于开发环境，自签名证书）
 */
const DEFAULT_CERT = `-----BEGIN CERTIFICATE-----
MIIEWDCCAsCgAwIBAgIQXYl/3HFmJ+HXAZNSd+5q+TANBgkqhkiG9w0BAQsFADCB
kTEeMBwGA1UEChMVbWtjZXJ0IGRldmVsb3BtZW50IENBMTMwMQYDVQQLDCpzaHVs
aWFuZ2Z1QE1hY0Jvb2stTTIubG9jYWwgKOa1rueUn+iLpeaipikxOjA4BgNVBAMM
MW1rY2VydCBzaHVsaWFuZ2Z1QE1hY0Jvb2stTTIubG9jYWwgKOa1rueUn+iLpeai
pikwHhcNMjUxMjIyMDE1NzUwWhcNMjgwMzIyMDE1NzUwWjBeMScwJQYDVQQKEx5t
a2NlcnQgZGV2ZWxvcG1lbnQgY2VydGlmaWNhdGUxMzAxBgNVBAsMKnNodWxpYW5n
ZnVATWFjQm9vay1NMi5sb2NhbCAo5rWu55Sf6Iul5qKmKTCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBAKVfhtopcdmqXpYMRkV2RJ1eByIC0qb75eQcDWc9
4NkvtEZTSRwxHDExArAucrHHa6/JLIp1bZmoHfpr6UlcsWoemfSLmfki77TXNx6U
1oPEVmO+7eWdQ9hdbnuNr7Zn+PCblwefIC+PaJTwvtoYIzVGleboqAPNcT32ek/d
pk+YOZfKNHCQrhncKt8xuh4u85yIyuPTvfSHsa6Zt2YHXRePtFhCJqj+hz6VPzo1
4X1zWjXxey1YIHivoOEJpxH5m72XyjB+eMKxo2MEO7RsA5AUe2jIInFF9KooqtML
UIdoK3QqZcLXA+8D/4KZyCwcXdf9cpa7BywCjC6H9GeIJrECAwEAAaNeMFwwDgYD
VR0PAQH/BAQDAgWgMBMGA1UdJQQMMAoGCCsGAQUFBwMBMB8GA1UdIwQYMBaAFG66
eiTxi8FBG3kBa+o1/8InLqFqMBQGA1UdEQQNMAuCCWxvY2FsaG9zdDANBgkqhkiG
9w0BAQsFAAOCAYEAdCeGUzu/y2WEP65GK25kitgStN8xJiF6fcY+wWwuwghQluce
Hidrf2TWuKzDWnFGwBxNQSHqbiO18sccaFgrnJQN8gIhKTELPngYQ3UrP2d3bfxv
Z4pDwrRPHg7PpM7DUJ1Lii+xRkS+SWZMHA4jnpD8xsRVcPDQAmWt9YJVIwve4fSc
Dip9cgd/genR2xUUD2/pVO7EomzSGBqF9r1se5rMHftwyftjIjY/I1RSPSSi85sS
8YDIjCaTdmyUQQNv7czXb3e83uuQih+Wpoy1DQ1TpqFm1OlxlVjVLgrtTwW4tWcK
nDXT66rVm/g83xjQAQS2OkS03CwFCFi02xS5H8mSJlzVaDZpiVu0b5N9SoJK9rkQ
cQShq37Uq6RWAuLqbqK9jjOFGbD9c0ilYgnvVNo2iXYsPyV4rUUtHTbwbaGTHbse
cztKIKmG0Jubx7RyrcGv8t9mihWZ0NEukv//GapknsfyGDhb3MxrNhnA+acMbVDc
WGtAAAGA8WbY3xmT
-----END CERTIFICATE-----`;

/**
 * 默认 TLS 私钥（用于开发环境，自签名证书）
 */
const DEFAULT_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQClX4baKXHZql6W
DEZFdkSdXgciAtKm++XkHA1nPeDZL7RGU0kcMRwxMQKwLnKxx2uvySyKdW2ZqB36
a+lJXLFqHpn0i5n5Iu+01zcelNaDxFZjvu3lnUPYXW57ja+2Z/jwm5cHnyAvj2iU
8L7aGCM1RpXm6KgDzXE99npP3aZPmDmXyjRwkK4Z3CrfMboeLvOciMrj0730h7Gu
mbdmB10Xj7RYQiao/oc+lT86NeF9c1o18XstWCB4r6DhCacR+Zu9l8owfnjCsaNj
BDu0bAOQFHtoyCJxRfSqKKrTC1CHaCt0KmXC1wPvA/+CmcgsHF3X/XKWuwcsAowu
h/RniCaxAgMBAAECggEAY6hLldEAARIAah//gQCinMr7NW3KEEMg6PRWx26sv3VW
CENMfabCvIoyeoWjLKtmo8pyAwZ9A+oiFrVNIp6vc6n5UTuHkHGTTsGbP9yl4UZC
YV2/821wY0T6vY5G43+Ir0a0Hy2vsbmUZp0mBjwhi4t77mkqRxBZO+P7FYIXJUM4
/iuiTbtDc8C6NbKiFVEV3Ijx59RkOn2nU9rY6OKJF7S9lI8y1bqmw+4hNdeQvi2n
pUfc++SGuvWR+oigQFrN9o1RTxcLPyCK1X50x+1Kexv/lPUGzdOv9iybCx/SZ8Nl
Xdr/xhgjYqwO9JOLzS9c3HHLS2abSA+5er7eXOQYuQKBgQDQrMXWfmfbpuez3QWu
/tkcadAARZBf2JK4quLO3Jq3ghVNM7Yy7XlqRe+CXJwQMH1oQg/yXPb7QAeoqP7W
OgvNxt2iyh4WGPfVpWsy1h6TYMdqDEg5IkKMW/fFVdIBSnY+JgPsdU/6jw9QoxZY
ZOYUZ7+4zsiOrkflP1hEqUqy0wKBgQDK4L7Z2NFSBWh0N+2i3cTRV0MZ+pCbUcjA
8subXSfswTGdXNtzgzh+JUbSKmhRN9BZxnVV0LGb3wIW1tWUno5weLwZcrCksABx
2gGqTndtC33LhKHaRyDFsu42+Dh7ndOE4pk/GbKwlETkzJiALEJD6sJz6Qt8m/5X
D2L3Afyl6wKBgBhRGdjN8CJbh8Kg7emfjwNNnUx6zsEshqR4XWfHs0vRH9RYQ1IZ
9D0bGzbwvcrxK5v7nsoaZTmQE5Rm5RNnvjpjgy5WKT1f+XlvBlftNbDs5TAJcF0g
Des3SF85ifhWigLiATEL1p8XDqzR5Ge2kk0sbd4GUr61tnETeaC+rZK7AoGAV2Ie
Ui61WiLCLuy4CmKDF7gCSvpFtuCvG4x4bl7dh3hfKmyIiWSHvK3Jp1RkwjbMIx78
Aw50sbKIb9XxAKaaq48VVdC0jPrR9jf0Z6qMfgdpE3P5Us84Km87c6nOilAcfywq
3abv9GaolfQZ63skv6QqRUqni/CUyGL0OXg9nikCgYBGyqNxJd6JPoUooPevyiOR
vvHjO6oUBcGBbPDfPipCldvDl58DuN4eIIlSkvVtJfriN+P4/OZnvLCzSxsW3G2h
3MjJqQYsdBmr05QD617FEqX4u65VKWu/d3so3cBHLFDKg+ssV6XQCpWERlywgLA4
+n8PGtO1a5j/fBZ7KkfSLw==
-----END PRIVATE KEY-----`;

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
export class Server {
  private middlewares: Middleware[] = [];
  private handler?: (req: Request, res: Response) => Promise<void> | void;
  private wsUpgradeHandler?: (req: globalThis.Request) => globalThis.Response | null;
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
  setHandler(handler: (req: Request, res: Response) => Promise<void> | void): void {
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
    handler: (req: globalThis.Request) => globalThis.Response | null
  ): void {
    this.wsUpgradeHandler = handler;
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
  async handleRequest(nativeReq: globalThis.Request): Promise<globalThis.Response> {
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
      json(
        data: unknown,
        options?: {
          charset?: string;
          status?: number;
          headers?: Record<string, string>;
        }
      ) {
        // 设置状态码（如果指定）
        if (options?.status !== undefined) {
          status = options.status;
        }

        // 设置 Content-Type
        const charset = options?.charset || 'utf-8';
        headers.set('content-type', `application/json; charset=${charset}`);

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
        }
      ) {
        // 设置状态码（如果指定）
        if (options?.status !== undefined) {
          status = options.status;
        }

        // 设置 Content-Type
        const charset = options?.charset || 'utf-8';
        headers.set('content-type', `text/html; charset=${charset}`);

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
        }
      ) {
        // 设置状态码（如果指定）
        if (options?.status !== undefined) {
          status = options.status;
        }

        // 类型映射表：将简写的类型名称映射到完整的 MIME 类型
        const typeMap: Record<string, string> = {
          html: 'text/html',
          text: 'text/plain',
          json: 'application/json',
          javascript: 'application/javascript',
          css: 'text/css',
          xml: 'application/xml',
          svg: 'image/svg+xml',
          binary: 'application/octet-stream',
        };

        // 设置 Content-Type
        if (options?.type) {
          // 根据 type 参数映射到对应的 MIME 类型
          const mimeType = typeMap[options.type] || 'text/plain';
          const charset = options.charset || 'utf-8';
          headers.set('content-type', `${mimeType}; charset=${charset}`);
        } else if (!headers.has('content-type')) {
          // 如果已经设置了 Content-Type，不覆盖（例如 Tailwind CSS 插件设置的 text/css）
          const charset = options?.charset || 'utf-8';
          headers.set('content-type', `text/plain; charset=${charset}`);
        } else if (options?.charset) {
          // 如果已有 Content-Type 但指定了 charset，更新 charset
          const existingType = headers.get('content-type') || '';
          const typeWithoutCharset = existingType.split(';')[0].trim();
          headers.set('content-type', `${typeWithoutCharset}; charset=${options.charset}`);
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
        }
      ) {
        // 根据 type 参数决定调用哪个方法
        if (options?.type === 'html') {
          return response.html(String(data), options);
        }

        // 明确指定 json 类型
        if (options?.type === 'json') {
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
        if (typeof data === 'string') {
          // 如果指定了 type，使用指定的 type，否则默认为 'text'
          const textOptions = {
            ...options,
            type: options?.type || 'text',
          };
          return response.text(data, textOptions);
        }

        // 处理 Uint8Array 二进制数据
        if (data instanceof Uint8Array) {
          // 如果指定了 type，使用指定的 type，否则默认为 'binary'
          const binaryOptions = {
            ...options,
            type: options?.type || 'binary',
          };
          return response.text(new TextDecoder().decode(data), binaryOptions);
        }

        // 默认情况：对象也转换为字符串返回 text
        // 如果指定了 type，使用指定的 type，否则默认为 'text'
        const textOptions = {
          ...options,
          type: options?.type || 'text',
        };
        return response.text(String(data), textOptions);
      },
      redirect(url: string, statusCode: number = 302) {
        status = statusCode;
        headers.set('location', url);
        return response;
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
   * @param tls TLS 配置（可选，用于启用 HTTPS）
   */
  async start(
    port: number,
    host: string,
    tls?: {
      certFile?: string;
      keyFile?: string;
      cert?: Uint8Array;
      key?: Uint8Array;
    }
  ): Promise<void> {
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
        const protocol = tls ? 'https' : 'http';
        console.log(`✅ 服务器已启动: ${protocol}://${host}:${port}`);
      },
    };

    // 如果配置了 TLS，添加证书和私钥
    if (tls) {
      let cert: string;
      let key: string;

      // 读取证书文件或使用提供的证书内容
      if (tls.certFile) {
        cert = await Deno.readTextFile(tls.certFile);
      } else if (tls.cert) {
        // 将 Uint8Array 转换为字符串
        cert = new TextDecoder().decode(tls.cert);
      } else {
        throw new Error('TLS 配置错误：必须提供 certFile 或 cert');
      }

      // 读取私钥文件或使用提供的私钥内容
      if (tls.keyFile) {
        key = await Deno.readTextFile(tls.keyFile);
      } else if (tls.key) {
        // 将 Uint8Array 转换为字符串
        key = new TextDecoder().decode(tls.key);
      } else {
        throw new Error('TLS 配置错误：必须提供 keyFile 或 key');
      }

      serveOptions.cert = cert;
      serveOptions.key = key;
    }

    // 使用 Deno.serve 启动服务器
    // Deno.serve 返回一个包含 shutdown 方法的对象
    const serverHandle = Deno.serve(serveOptions, handler);
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

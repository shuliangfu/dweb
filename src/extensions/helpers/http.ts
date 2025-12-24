/**
 * 前端 HTTP 请求库
 * 基于 fetch，提供拦截器、错误处理、请求取消等功能
 */

/**
 * 请求配置选项
 */
export interface RequestConfig {
  /** 请求 URL */
  url?: string;
  /** 请求方法，默认 GET */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求参数（URL 查询参数） */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** 请求体数据 */
  data?: unknown;
  /** 超时时间（毫秒），默认 0（不超时） */
  timeout?: number;
  /** 是否携带凭证（cookies），默认 false */
  credentials?: RequestCredentials;
  /** 请求模式，默认 'cors' */
  mode?: RequestMode;
  /** 缓存模式 */
  cache?: RequestCache;
  /** 重定向模式 */
  redirect?: RequestRedirect;
  /** 请求信号（用于取消请求） */
  signal?: AbortSignal;
  /** 响应类型，默认 'json' */
  responseType?: "json" | "text" | "blob" | "arrayBuffer" | "formData";
  /** 是否在响应拦截器中自动处理错误，默认 true */
  validateStatus?: (status: number) => boolean;
  /** 基础 URL */
  baseURL?: string;
  /** 请求拦截器（在发送请求前执行） */
  transformRequest?: (
    config: RequestConfig,
  ) => RequestConfig | Promise<RequestConfig>;
  /** 响应拦截器（在收到响应后执行） */
  transformResponse?: <T = unknown>(
    data: unknown,
    response: Response,
  ) => T | Promise<T>;
}

/**
 * 请求拦截器函数类型
 */
export type RequestInterceptor = (
  config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;

/**
 * 响应拦截器函数类型
 */
export type ResponseInterceptor = (
  response: Response,
  config: RequestConfig,
) => Response | Promise<Response>;

/**
 * 错误拦截器函数类型
 */
export type ErrorInterceptor = (
  error: Error | Response,
  config?: RequestConfig,
) => Promise<never> | unknown;

/**
 * HTTP 请求类
 */
export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config?: {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
  }) {
    this.baseURL = config?.baseURL || "";
    this.defaultHeaders = config?.headers || {
      "Content-Type": "application/json",
    };
    this.defaultTimeout = config?.timeout || 0;
  }

  /**
   * 添加请求拦截器
   */
  interceptors = {
    request: {
      use: (interceptor: RequestInterceptor): (() => void) => {
        this.requestInterceptors.push(interceptor);
        return () => {
          const index = this.requestInterceptors.indexOf(interceptor);
          if (index > -1) {
            this.requestInterceptors.splice(index, 1);
          }
        };
      },
    },
    response: {
      use: (
        onFulfilled?: ResponseInterceptor,
        onRejected?: ErrorInterceptor,
      ): (() => void) => {
        if (onFulfilled) {
          this.responseInterceptors.push(onFulfilled);
        }
        if (onRejected) {
          this.errorInterceptors.push(onRejected);
        }
        return () => {
          if (onFulfilled) {
            const index = this.responseInterceptors.indexOf(onFulfilled);
            if (index > -1) {
              this.responseInterceptors.splice(index, 1);
            }
          }
          if (onRejected) {
            const index = this.errorInterceptors.indexOf(onRejected);
            if (index > -1) {
              this.errorInterceptors.splice(index, 1);
            }
          }
        };
      },
    },
  };

  /**
   * 执行请求拦截器
   */
  private async applyRequestInterceptors(
    config: RequestConfig,
  ): Promise<RequestConfig> {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    if (finalConfig.transformRequest) {
      finalConfig = await finalConfig.transformRequest(finalConfig);
    }
    return finalConfig;
  }

  /**
   * 执行响应拦截器
   */
  private async applyResponseInterceptors(
    response: Response,
    config: RequestConfig,
  ): Promise<Response> {
    let finalResponse = response;
    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse, config);
    }
    return finalResponse;
  }

  /**
   * 执行错误拦截器
   */
  private async applyErrorInterceptors(
    error: Error | Response,
    config?: RequestConfig,
  ): Promise<never> {
    for (const interceptor of this.errorInterceptors) {
      try {
        const result = await interceptor(error, config);
        if (result !== undefined) {
          throw result;
        }
      } catch (e) {
        throw e;
      }
    }
    throw error;
  }

  /**
   * 构建完整的 URL
   */
  private buildURL(
    url: string,
    params?: Record<string, string | number | boolean | null | undefined>,
  ): string {
    let fullURL = url;

    // 添加基础 URL
    if (
      this.baseURL && !url.startsWith("http://") && !url.startsWith("https://")
    ) {
      fullURL = `${this.baseURL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
    }

    // 添加查询参数
    if (params && Object.keys(params).length > 0) {
      const urlObj = new URL(
        fullURL,
        typeof globalThis !== "undefined" && "location" in globalThis
          ? (globalThis as { location: { origin: string } }).location.origin
          : "http://localhost",
      );
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          urlObj.searchParams.append(key, String(value));
        }
      });
      fullURL = urlObj.toString();
    }

    return fullURL;
  }

  /**
   * 构建请求体
   */
  private buildBody(
    data: unknown,
    headers: Record<string, string>,
  ): BodyInit | null {
    if (!data) {
      return null;
    }

    const contentType = headers["Content-Type"] || headers["content-type"] ||
      "";

    if (contentType.includes("application/json")) {
      return JSON.stringify(data);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      if (typeof data === "object" && data !== null) {
        const formData = new URLSearchParams();
        Object.entries(data as Record<string, unknown>).forEach(
          ([key, value]) => {
            if (value !== null && value !== undefined) {
              formData.append(key, String(value));
            }
          },
        );
        return formData;
      }
      return String(data);
    } else if (contentType.includes("multipart/form-data")) {
      if (data instanceof FormData) {
        return data;
      }
      // 如果不是 FormData，尝试转换
      const formData = new FormData();
      if (typeof data === "object" && data !== null) {
        Object.entries(data as Record<string, unknown>).forEach(
          ([key, value]) => {
            if (value instanceof File || value instanceof Blob) {
              formData.append(key, value);
            } else if (value !== null && value !== undefined) {
              formData.append(key, String(value));
            }
          },
        );
      }
      return formData;
    } else if (
      data instanceof FormData || data instanceof Blob ||
      data instanceof ArrayBuffer
    ) {
      return data;
    } else {
      return JSON.stringify(data);
    }
  }

  /**
   * 处理响应数据
   */
  private async handleResponse<T = unknown>(
    response: Response,
    responseType: RequestConfig["responseType"] = "json",
  ): Promise<T> {
    switch (responseType) {
      case "text":
        return (await response.text()) as T;
      case "blob":
        return (await response.blob()) as T;
      case "arrayBuffer":
        return (await response.arrayBuffer()) as T;
      case "formData":
        return (await response.formData()) as T;
      case "json":
      default:
        try {
          const text = await response.text();
          return text ? (JSON.parse(text) as T) : (null as T);
        } catch {
          return null as T;
        }
    }
  }

  /**
   * 创建超时 AbortSignal
   */
  private createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, timeout);
    return controller.signal;
  }

  /**
   * 发送请求
   */
  async request<T = unknown>(config: RequestConfig): Promise<T> {
    try {
      // 应用请求拦截器
      const finalConfig = await this.applyRequestInterceptors(config);

      // 构建 URL
      const url = finalConfig.url || "";
      if (!url) {
        throw new Error("请求 URL 不能为空");
      }
      const fullURL = this.buildURL(url, finalConfig.params);

      // 合并请求头
      const headers = {
        ...this.defaultHeaders,
        ...finalConfig.headers,
      };

      // 构建请求体
      const body = this.buildBody(finalConfig.data, headers);

      // 创建 AbortSignal（支持超时和自定义 signal）
      let signal = finalConfig.signal;
      const timeout = finalConfig.timeout ?? this.defaultTimeout;
      if (timeout > 0) {
        const timeoutSignal = this.createTimeoutSignal(timeout);
        if (signal) {
          // 如果已有 signal，需要合并
          const combinedController = new AbortController();
          signal.addEventListener("abort", () => combinedController.abort());
          timeoutSignal.addEventListener(
            "abort",
            () => combinedController.abort(),
          );
          signal = combinedController.signal;
        } else {
          signal = timeoutSignal;
        }
      }

      // 发送请求
      const response = await fetch(fullURL, {
        method: finalConfig.method || "GET",
        headers,
        body,
        credentials: finalConfig.credentials,
        mode: finalConfig.mode,
        cache: finalConfig.cache,
        redirect: finalConfig.redirect,
        signal,
      });

      // 应用响应拦截器
      const finalResponse = await this.applyResponseInterceptors(
        response,
        finalConfig,
      );

      // 检查状态码
      const validateStatus = finalConfig.validateStatus ||
        ((status: number) => status >= 200 && status < 300);
      if (!validateStatus(finalResponse.status)) {
        throw finalResponse;
      }

      // 处理响应数据
      const responseType = finalConfig.responseType || "json";
      let data = await this.handleResponse<T>(finalResponse, responseType);

      // 应用响应转换器
      if (finalConfig.transformResponse) {
        data = await finalConfig.transformResponse<T>(data, finalResponse);
      }

      return data;
    } catch (error) {
      // 处理错误
      if (error instanceof Error && error.name === "AbortError") {
        const abortError = new Error("请求超时或已取消");
        abortError.name = "AbortError";
        return await this.applyErrorInterceptors(abortError, config);
      }

      if (error instanceof Response) {
        // HTTP 错误响应
        try {
          const errorData = await this.handleResponse(
            error,
            config.responseType,
          );
          const httpError = new Error(
            `HTTP ${error.status}: ${error.statusText}`,
          );
          (httpError as unknown as { response: Response; data: unknown })
            .response = error;
          (httpError as unknown as { response: Response; data: unknown }).data =
            errorData;
          return await this.applyErrorInterceptors(httpError, config);
        } catch {
          return await this.applyErrorInterceptors(error, config);
        }
      }

      // 其他错误
      return await this.applyErrorInterceptors(error as Error, config);
    }
  }

  /**
   * GET 请求
   */
  get<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  /**
   * POST 请求
   */
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "POST", data });
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "PUT", data });
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  /**
   * PATCH 请求
   */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "PATCH", data });
  }

  /**
   * HEAD 请求
   */
  head<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "HEAD" });
  }

  /**
   * OPTIONS 请求
   */
  options<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "OPTIONS" });
  }
}

/**
 * 创建 HTTP 客户端实例
 */
export function createHttpClient(config?: {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}): HttpClient {
  return new HttpClient(config);
}

/**
 * 默认 HTTP 客户端实例
 */
export const http: HttpClient = createHttpClient();

/**
 * 便捷方法：直接使用默认实例
 */
export const request = <T = unknown>(config: RequestConfig): Promise<T> =>
  http.request<T>(config);
export const get = <T = unknown>(
  url: string,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.get<T>(url, config);
export const post = <T = unknown>(
  url: string,
  data?: unknown,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.post<T>(url, data, config);
export const put = <T = unknown>(
  url: string,
  data?: unknown,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.put<T>(url, data, config);
export const del = <T = unknown>(
  url: string,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.delete<T>(url, config);
export const patch = <T = unknown>(
  url: string,
  data?: unknown,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.patch<T>(url, data, config);
export const head = <T = unknown>(
  url: string,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.head<T>(url, config);
export const options = <T = unknown>(
  url: string,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.options<T>(url, config);

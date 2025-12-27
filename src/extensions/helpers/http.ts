/**
 * 前端 HTTP 请求库
 * 基于 fetch，提供拦截器、错误处理、请求取消、重试、并发请求、文件上传/下载等功能
 *
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 * - 注意：部分功能（如文件上传/下载、进度追踪）在服务端环境可能受限
 */

/**
 * 请求重试配置
 */
export interface RetryConfig {
  /** 重试次数，默认 0（不重试） */
  times?: number;
  /** 重试延迟（毫秒），默认 1000 */
  delay?: number;
  /** 重试条件函数，返回 true 则重试 */
  retryCondition?: (error: Error | Response) => boolean;
  /** 重试回调函数 */
  onRetry?: (error: Error | Response, attempt: number) => void;
}

/**
 * 请求进度信息
 */
export interface ProgressInfo {
  /** 已传输字节数 */
  loaded: number;
  /** 总字节数（如果已知） */
  total?: number;
  /** 进度百分比（0-100） */
  percent?: number;
}

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
  /** 请求重试配置 */
  retry?: RetryConfig;
  /** 是否启用请求去重，默认 false */
  dedupe?: boolean;
  /** 请求去重键（用于标识相同请求），默认使用 URL + method */
  dedupeKey?: string;
  /** 上传进度回调 */
  onUploadProgress?: (progress: ProgressInfo) => void;
  /** 下载进度回调 */
  onDownloadProgress?: (progress: ProgressInfo) => void;
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
  // 请求去重：存储正在进行的请求
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

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
      use: (interceptor: RequestInterceptor): () => void => {
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
      ): () => void => {
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
   * 生成请求去重键
   */
  private generateDedupeKey(config: RequestConfig): string {
    if (config.dedupeKey) {
      return config.dedupeKey;
    }
    const url = config.url || "";
    const method = config.method || "GET";
    const params = config.params ? JSON.stringify(config.params) : "";
    return `${method}:${url}:${params}`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(
    error: Error | Response,
    retryConfig: RetryConfig,
    attempt: number,
  ): boolean {
    if (attempt >= (retryConfig.times || 0)) {
      return false;
    }

    if (retryConfig.retryCondition) {
      return retryConfig.retryCondition(error);
    }

    // 默认重试条件：网络错误或 5xx 错误
    if (error instanceof Error) {
      return error.name === "AbortError" || error.message.includes("fetch");
    }

    if (error instanceof Response) {
      return error.status >= 500 && error.status < 600;
    }

    return false;
  }

  /**
   * 带重试的请求执行
   */
  private async requestWithRetry<T = unknown>(
    config: RequestConfig,
  ): Promise<T> {
    const retryConfig = config.retry || { times: 0 };
    let lastError: Error | Response | null = null;

    for (let attempt = 0; attempt <= (retryConfig.times || 0); attempt++) {
      try {
        return await this.executeRequest<T>(config);
      } catch (error) {
        lastError = error as Error | Response;

        // 判断是否应该重试
        if (!this.shouldRetry(lastError, retryConfig, attempt)) {
          throw lastError;
        }

        // 执行重试回调
        if (retryConfig.onRetry) {
          retryConfig.onRetry(lastError, attempt + 1);
        }

        // 延迟后重试
        const delay = retryConfig.delay || 1000;
        await this.delay(delay);
      }
    }

    throw lastError || new Error("请求失败");
  }

  /**
   * 执行单个请求（不包含重试逻辑）
   */
  private async executeRequest<T = unknown>(
    config: RequestConfig,
  ): Promise<T> {
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

    // 创建请求配置
    const fetchOptions: RequestInit = {
      method: finalConfig.method || "GET",
      headers,
      body,
      credentials: finalConfig.credentials,
      mode: finalConfig.mode,
      cache: finalConfig.cache,
      redirect: finalConfig.redirect,
      signal,
    };

    // 发送请求（支持进度追踪）
    let response: Response;
    if (
      finalConfig.onUploadProgress && body &&
      (body instanceof FormData || body instanceof Blob)
    ) {
      // 上传进度追踪（需要手动实现，因为 fetch 不支持）
      // 注意：fetch API 本身不支持上传进度，这里提供一个占位实现
      response = await fetch(fullURL, fetchOptions);
      if (finalConfig.onUploadProgress) {
        finalConfig.onUploadProgress({
          loaded: body instanceof Blob ? body.size : 0,
          total: body instanceof Blob ? body.size : undefined,
          percent: 100,
        });
      }
    } else {
      response = await fetch(fullURL, fetchOptions);
    }

    // 下载进度追踪
    if (finalConfig.onDownloadProgress && response.body) {
      const reader = response.body.getReader();
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : undefined;
      let loaded = 0;

      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            loaded += value.length;
            controller.enqueue(value);

            if (finalConfig.onDownloadProgress) {
              finalConfig.onDownloadProgress({
                loaded,
                total,
                percent: total ? Math.round((loaded / total) * 100) : undefined,
              });
            }
          }
          controller.close();
        },
      });

      // 创建新的 Response 对象
      response = new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

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
  }

  /**
   * 发送请求
   */
  async request<T = unknown>(config: RequestConfig): Promise<T> {
    try {
      // 请求去重处理
      if (config.dedupe) {
        const dedupeKey = this.generateDedupeKey(config);
        const pendingRequest = this.pendingRequests.get(dedupeKey);

        if (pendingRequest) {
          // 如果已有相同请求在进行，返回该请求的 Promise
          return pendingRequest as Promise<T>;
        }

        // 创建新请求并存储
        const requestPromise = this.requestWithRetry<T>(config)
          .finally(() => {
            // 请求完成后移除
            this.pendingRequests.delete(dedupeKey);
          });

        this.pendingRequests.set(dedupeKey, requestPromise);
        return requestPromise;
      }

      // 不使用去重，直接执行请求
      return await this.requestWithRetry<T>(config);
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

  /**
   * 并发请求（类似 Promise.all）
   * 所有请求成功时返回结果数组，任何一个失败则抛出错误
   */
  all<T extends readonly unknown[] | []>(
    requests: {
      [K in keyof T]: Promise<T[K]>;
    },
  ): Promise<T> {
    return Promise.all(requests) as Promise<T>;
  }

  /**
   * 并发请求（类似 Promise.allSettled）
   * 所有请求完成后返回结果，无论成功或失败
   */
  allSettled<T extends readonly unknown[] | []>(
    requests: {
      [K in keyof T]: Promise<T[K]>;
    },
  ): Promise<
    {
      [K in keyof T]: PromiseSettledResult<Awaited<T[K]>>;
    }
  > {
    return Promise.allSettled(requests) as Promise<
      {
        [K in keyof T]: PromiseSettledResult<Awaited<T[K]>>;
      }
    >;
  }

  /**
   * 文件上传
   * @param url 上传地址
   * @param file 文件对象（File 或 Blob）
   * @param config 请求配置
   */
  upload<T = unknown>(
    url: string,
    file: File | Blob,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : "file";
    formData.append("file", file, fileName);

    return this.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        // 不设置 Content-Type，让浏览器自动设置（包含 boundary）
      },
    });
  }

  /**
   * 文件下载
   * @param url 下载地址
   * @param config 请求配置
   * @returns 返回 Blob 对象
   */
  download(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data" | "responseType">,
  ): Promise<Blob> {
    return this.get<Blob>(url, {
      ...config,
      responseType: "blob",
    });
  }

  /**
   * 下载文件并保存到本地（浏览器环境）
   * @param url 下载地址
   * @param filename 保存的文件名
   * @param config 请求配置
   */
  async downloadFile(
    url: string,
    filename?: string,
    config?: Omit<RequestConfig, "url" | "method" | "data" | "responseType">,
  ): Promise<void> {
    const blob = await this.download(url, config);

    // 检查是否在浏览器环境
    if (
      typeof globalThis === "undefined" ||
      !("document" in globalThis) ||
      !("URL" in globalThis)
    ) {
      throw new Error("downloadFile 方法仅在浏览器环境中可用");
    }

    // 创建下载链接
    const downloadUrl = URL.createObjectURL(blob);
    const doc = (globalThis as unknown as {
      document: {
        createElement: (
          tag: string,
        ) => { href: string; download: string; click: () => void };
        body: {
          appendChild: (el: unknown) => void;
          removeChild: (el: unknown) => void;
        };
      };
    }).document;
    const link = doc.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "download";

    // 触发下载
    const body = doc.body;
    body.appendChild(link);
    link.click();
    body.removeChild(link);

    // 释放 URL 对象
    URL.revokeObjectURL(downloadUrl);
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

/**
 * 并发请求（类似 Promise.all）
 */
export const all = <T extends readonly unknown[] | []>(
  requests: {
    [K in keyof T]: Promise<T[K]>;
  },
): Promise<T> => http.all<T>(requests);

/**
 * 并发请求（类似 Promise.allSettled）
 */
export const allSettled = <T extends readonly unknown[] | []>(
  requests: {
    [K in keyof T]: Promise<T[K]>;
  },
): Promise<
  {
    [K in keyof T]: PromiseSettledResult<Awaited<T[K]>>;
  }
> => http.allSettled<T>(requests);

/**
 * 文件上传
 */
export const upload = <T = unknown>(
  url: string,
  file: File | Blob,
  config?: Omit<RequestConfig, "url" | "method" | "data">,
): Promise<T> => http.upload<T>(url, file, config);

/**
 * 文件下载
 */
export const download = (
  url: string,
  config?: Omit<RequestConfig, "url" | "method" | "data" | "responseType">,
): Promise<Blob> => http.download(url, config);

/**
 * 下载文件并保存到本地
 */
export const downloadFile = (
  url: string,
  filename?: string,
  config?: Omit<RequestConfig, "url" | "method" | "data" | "responseType">,
): Promise<void> => http.downloadFile(url, filename, config);

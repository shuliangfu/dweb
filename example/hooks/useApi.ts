/**
 * API 调用 Hook
 * 提供统一的 API 调用封装，包括 loading、error 状态管理
 */

import { useState, useCallback } from 'preact/hooks';

/**
 * API 请求配置
 */
export interface ApiRequestConfig extends RequestInit {
  /** 请求 URL */
  url: string;
  /** 请求方法（默认 GET） */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 请求参数（GET 请求会拼接到 URL，POST 等会作为 body） */
  params?: Record<string, any>;
  /** 请求体数据（POST、PUT、PATCH 使用） */
  data?: Record<string, any>;
  /** 是否自动处理错误（默认 true） */
  autoHandleError?: boolean;
  /** 自定义错误处理函数 */
  onError?: (error: Error) => void;
  /** 请求成功回调 */
  onSuccess?: (data: any) => void;
}

/**
 * API 响应结果
 */
export interface ApiResponse<T = any> {
  /** 响应数据 */
  data: T | null;
  /** 错误信息 */
  error: Error | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否请求成功 */
  success: boolean;
}

/**
 * useApi Hook 返回值
 */
export interface UseApiReturn {
  /** 当前响应状态 */
  response: ApiResponse;
  /** 发送 GET 请求 */
  get: <T = any>(url: string, params?: Record<string, any>, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'params'>) => Promise<T | null>;
  /** 发送 POST 请求 */
  post: <T = any>(url: string, data?: Record<string, any>, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>) => Promise<T | null>;
  /** 发送 PUT 请求 */
  put: <T = any>(url: string, data?: Record<string, any>, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>) => Promise<T | null>;
  /** 发送 DELETE 请求 */
  del: <T = any>(url: string, params?: Record<string, any>, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'params'>) => Promise<T | null>;
  /** 发送 PATCH 请求 */
  patch: <T = any>(url: string, data?: Record<string, any>, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>) => Promise<T | null>;
  /** 发送自定义请求 */
  request: <T = any>(config: ApiRequestConfig) => Promise<T | null>;
  /** 重置状态 */
  reset: () => void;
}

/**
 * API 调用 Hook
 * @param defaultConfig 默认请求配置（可选）
 * @returns API 调用对象
 * 
 * @example
 * ```typescript
 * const api = useApi();
 * 
 * // GET 请求
 * const users = await api.get('/api/users', { page: 1, limit: 10 });
 * 
 * // POST 请求
 * const result = await api.post('/api/users', {
 *   name: 'John',
 *   email: 'john@example.com'
 * });
 * 
 * // 在组件中使用
 * const { response, get, post } = useApi();
 * 
 * useEffect(() => {
 *   get('/api/users').then(data => {
 *     console.log('用户列表:', data);
 *   });
 * }, []);
 * 
 * if (response.loading) return <div>加载中...</div>;
 * if (response.error) return <div>错误: {response.error.message}</div>;
 * ```
 */
export function useApi(defaultConfig?: Partial<ApiRequestConfig>): UseApiReturn {
  const [response, setResponse] = useState<ApiResponse>({
    data: null,
    error: null,
    loading: false,
    success: false,
  });

  /**
   * 构建查询字符串
   */
  const buildQueryString = useCallback((params: Record<string, any>): string => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    return searchParams.toString();
  }, []);

  /**
   * 发送请求
   */
  const request = useCallback(async <T = any>(config: ApiRequestConfig): Promise<T | null> => {
    const {
      url,
      method = 'GET',
      params,
      data,
      autoHandleError = true,
      onError,
      onSuccess,
      headers = {},
      ...restConfig
    } = { ...defaultConfig, ...config };

    // 设置 loading 状态
    setResponse((prev) => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
    }));

    try {
      // 构建完整 URL
      let fullUrl = url;
      if (params && Object.keys(params).length > 0) {
        const queryString = buildQueryString(params);
        fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
      }

      // 构建请求配置
      const requestConfig: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...restConfig,
      };

      // 添加请求体（POST、PUT、PATCH）
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        requestConfig.body = JSON.stringify(data);
      }

      // 发送请求
      const fetchResponse = await fetch(fullUrl, requestConfig);

      // 检查响应状态
      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
      }

      // 解析响应数据
      const responseData = await fetchResponse.json();

      // 更新成功状态
      setResponse({
        data: responseData,
        error: null,
        loading: false,
        success: true,
      });

      // 调用成功回调
      if (onSuccess) {
        onSuccess(responseData);
      }

      return responseData as T;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error(String(error));

      // 更新错误状态
      setResponse({
        data: null,
        error: apiError,
        loading: false,
        success: false,
      });

      // 错误处理
      if (autoHandleError) {
        console.error('[useApi] 请求失败:', apiError);
      }

      if (onError) {
        onError(apiError);
      }

      return null;
    }
  }, [defaultConfig, buildQueryString]);

  /**
   * GET 请求
   */
  const get = useCallback(<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'params'>,
  ): Promise<T | null> => {
    return request<T>({
      url,
      method: 'GET',
      params,
      ...config,
    });
  }, [request]);

  /**
   * POST 请求
   */
  const post = useCallback(<T = any>(
    url: string,
    data?: Record<string, any>,
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>,
  ): Promise<T | null> => {
    return request<T>({
      url,
      method: 'POST',
      data,
      ...config,
    });
  }, [request]);

  /**
   * PUT 请求
   */
  const put = useCallback(<T = any>(
    url: string,
    data?: Record<string, any>,
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>,
  ): Promise<T | null> => {
    return request<T>({
      url,
      method: 'PUT',
      data,
      ...config,
    });
  }, [request]);

  /**
   * DELETE 请求
   */
  const del = useCallback(<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'params'>,
  ): Promise<T | null> => {
    return request<T>({
      url,
      method: 'DELETE',
      params,
      ...config,
    });
  }, [request]);

  /**
   * PATCH 请求
   */
  const patch = useCallback(<T = any>(
    url: string,
    data?: Record<string, any>,
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>,
  ): Promise<T | null> => {
    return request<T>({
      url,
      method: 'PATCH',
      data,
      ...config,
    });
  }, [request]);

  /**
   * 重置状态
   */
  const reset = useCallback((): void => {
    setResponse({
      data: null,
      error: null,
      loading: false,
      success: false,
    });
  }, []);

  return {
    response,
    get,
    post,
    put,
    del,
    patch,
    request,
    reset,
  };
}


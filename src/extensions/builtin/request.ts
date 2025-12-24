/**
 * Request 内置扩展
 * 为 Request 类型提供实用的扩展方法
 */

import { registerExtension } from '../registry.ts';

/**
 * 初始化 Request 扩展
 * 注册所有 Request 类型的扩展方法
 */
export function initRequestExtensions(): void {
  /**
   * 获取查询参数
   * 从请求 URL 中获取查询参数
   * 
   * @param {string} [key] - 可选的参数键名，如果指定则返回该键对应的值，否则返回所有参数的对象
   * @returns {string | Record<string, string> | null} 如果指定了 key 则返回对应的值（不存在返回 null），否则返回所有参数的对象
   * 
   * @example
   * ```typescript
   * // URL: /api/users?page=1&limit=10
   * request.getQuery('page'); // "1"
   * request.getQuery('limit'); // "10"
   * request.getQuery(); // { page: "1", limit: "10" }
   * request.getQuery('sort'); // null
   * ```
   */
  registerExtension({
    name: 'getQuery',
    type: 'method',
    target: 'Request',
    handler: function (this: Request, key?: string): unknown {
      const url = new URL(this.url);
      const params = url.searchParams;

      if (key) {
        return params.get(key);
      }

      const result: Record<string, string> = {};
      for (const [k, v] of params.entries()) {
        result[k] = v;
      }
      return result;
    },
    description: '获取查询参数，如果指定key则返回单个值，否则返回所有参数对象',
  });

  /**
   * 获取路径参数
   * 获取路由路径中的参数（需要在路由系统中设置 params）
   * 
   * @returns {Record<string, string>} 路径参数对象，如果未设置则返回空对象
   * 
   * @example
   * ```typescript
   * // 路由: /api/users/:id/posts/:postId
   * // 请求: /api/users/123/posts/456
   * // 如果路由系统设置了 params
   * request.getParams(); // { id: "123", postId: "456" }
   * 
   * // 注意：需要在路由系统中设置 params 属性到 Request 对象
   * ```
   */
  registerExtension({
    name: 'getParams',
    type: 'method',
    target: 'Request',
    handler: function (this: Request): Record<string, string> {
      // 注意：这需要在路由系统中设置 params
      // 这里返回空对象，实际使用时需要从路由上下文获取
      return (this as unknown as { params?: Record<string, string> }).params || {};
    },
    description: '获取路径参数（需要在路由系统中设置）',
  });

  /**
   * 检查是否为 AJAX 请求
   * 通过检查请求头判断是否为 AJAX 请求
   * 
   * @returns {boolean} 如果是 AJAX 请求则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * // 设置了 X-Requested-With: XMLHttpRequest 的请求
   * request.isAjax(); // true
   * 
   * // Content-Type 为 application/json 的请求
   * request.isAjax(); // true
   * 
   * // 普通页面请求
   * request.isAjax(); // false
   * ```
   */
  registerExtension({
    name: 'isAjax',
    type: 'method',
    target: 'Request',
    handler: function (this: Request): boolean {
      const header = this.headers.get('X-Requested-With');
      const contentType = this.headers.get('Content-Type');
      return header === 'XMLHttpRequest' || (contentType?.includes('application/json') ?? false);
    },
    description: '检查请求是否为 AJAX 请求',
  });

  /**
   * 检查是否为移动设备
   * 通过 User-Agent 请求头判断请求是否来自移动设备
   * 
   * @returns {boolean} 如果请求来自移动设备则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * // User-Agent 包含 Mobile、Android、iPhone 或 iPad
   * request.isMobile(); // true
   * 
   * // 普通桌面浏览器
   * request.isMobile(); // false
   * ```
   */
  registerExtension({
    name: 'isMobile',
    type: 'method',
    target: 'Request',
    handler: function (this: Request): boolean {
      const userAgent = this.headers.get('User-Agent') || '';
      return /Mobile|Android|iPhone|iPad/i.test(userAgent);
    },
    description: '检查请求是否来自移动设备',
  });

  /**
   * 获取客户端IP
   * 从请求头中获取客户端真实IP地址，优先从 X-Forwarded-For 和 X-Real-IP 获取
   * 
   * @returns {string} 客户端IP地址，如果无法获取则返回 'unknown'
   * 
   * @example
   * ```typescript
   * // 如果请求头包含 X-Forwarded-For: 192.168.1.1, 10.0.0.1
   * request.getIp(); // "192.168.1.1"（取第一个IP）
   * 
   * // 如果请求头包含 X-Real-IP: 192.168.1.1
   * request.getIp(); // "192.168.1.1"
   * 
   * // 如果都没有，返回 'unknown'
   * request.getIp(); // "unknown"
   * ```
   */
  registerExtension({
    name: 'getIp',
    type: 'method',
    target: 'Request',
    handler: function (this: Request): string {
      // 尝试从各种头部获取真实IP
      const forwarded = this.headers.get('X-Forwarded-For');
      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }

      const realIp = this.headers.get('X-Real-IP');
      if (realIp) {
        return realIp;
      }

      // 如果是在服务器环境中，可能需要从连接信息获取
      return 'unknown';
    },
    description: '获取客户端IP地址',
  });

  /**
   * 检查请求方法
   * 检查请求的 HTTP 方法是否与指定方法匹配（不区分大小写）
   * 
   * @param {string} method - 要检查的 HTTP 方法，如 'GET'、'POST'、'PUT'、'DELETE' 等
   * @returns {boolean} 如果请求方法匹配则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * // GET 请求
   * request.isMethod('GET'); // true
   * request.isMethod('get'); // true（不区分大小写）
   * request.isMethod('POST'); // false
   * 
   * // POST 请求
   * request.isMethod('POST'); // true
   * request.isMethod('PUT'); // false
   * ```
   */
  registerExtension({
    name: 'isMethod',
    type: 'method',
    target: 'Request',
    handler: function (this: Request, method: string): boolean {
      return this.method.toUpperCase() === method.toUpperCase();
    },
    description: '检查请求方法是否匹配',
  });

  /**
   * 获取请求体（JSON）
   * 获取请求体并解析为 JSON 对象，如果解析失败则返回 null
   * 
   * @returns {Promise<unknown>} 解析后的 JSON 对象，如果解析失败则返回 null
   * 
   * @example
   * ```typescript
   * // 请求体: { "name": "Alice", "age": 30 }
   * const data = await request.getJson();
   * // data = { name: "Alice", age: 30 }
   * 
   * // 如果请求体不是有效的 JSON
   * const invalid = await request.getJson();
   * // invalid = null
   * ```
   */
  registerExtension({
    name: 'getJson',
    type: 'method',
    target: 'Request',
    handler: async function (this: Request): Promise<unknown> {
      try {
        return await this.json();
      } catch {
        return null;
      }
    },
    description: '获取请求体并解析为JSON',
  });

  /**
   * 获取请求体（文本）
   * 获取请求体的文本内容，如果获取失败则返回空字符串
   * 
   * @returns {Promise<string>} 请求体的文本内容，如果获取失败则返回空字符串
   * 
   * @example
   * ```typescript
   * // 请求体: "Hello World"
   * const text = await request.getText();
   * // text = "Hello World"
   * 
   * // 如果请求体为空或获取失败
   * const empty = await request.getText();
   * // empty = ""
   * ```
   */
  registerExtension({
    name: 'getText',
    type: 'method',
    target: 'Request',
    handler: async function (this: Request): Promise<string> {
      try {
        return await this.text();
      } catch {
        return '';
      }
    },
    description: '获取请求体文本',
  });
}


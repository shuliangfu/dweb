/**
 * URL 工具
 * 提供 URL 解析、构建、查询参数处理等功能
 * 
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 */

/**
 * 解析的 URL 对象接口
 */
export interface ParsedUrl {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  href: string;
}

/**
 * 解析 URL
 * 将 URL 字符串解析为对象
 * 
 * @param url URL 字符串
 * @returns 解析后的 URL 对象
 * 
 * @example
 * ```typescript
 * const parsed = parseUrl('https://example.com:8080/path?key=value#hash');
 * // {
 * //   protocol: 'https:',
 * //   hostname: 'example.com',
 * //   port: '8080',
 * //   pathname: '/path',
 * //   search: '?key=value',
 * //   hash: '#hash',
 * //   origin: 'https://example.com:8080',
 * //   href: 'https://example.com:8080/path?key=value#hash'
 * // }
 * ```
 */
export function parseUrl(url: string): ParsedUrl {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      origin: urlObj.origin,
      href: urlObj.href,
    };
  } catch {
    // 如果 URL 无效，尝试相对 URL
    const urlObj = new URL(url, typeof globalThis !== "undefined" && "location" in globalThis
      ? (globalThis as { location: { origin: string } }).location.origin
      : "http://localhost");
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      origin: urlObj.origin,
      href: urlObj.href,
    };
  }
}

/**
 * 构建 URL
 * 根据路径和查询参数构建完整的 URL
 * 
 * @param path 路径
 * @param params 查询参数对象
 * @param baseUrl 基础 URL（可选）
 * @returns 构建后的 URL 字符串
 * 
 * @example
 * ```typescript
 * buildUrl('/api/users', { page: 1, limit: 10 });
 * // '/api/users?page=1&limit=10'
 * 
 * buildUrl('/api/users', { page: 1 }, 'https://api.example.com');
 * // 'https://api.example.com/api/users?page=1'
 * ```
 */
export function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  baseUrl?: string,
): string {
  let url = path;

  // 添加基础 URL
  if (baseUrl) {
    url = `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  }

  // 添加查询参数
  if (params && Object.keys(params).length > 0) {
    const urlObj = new URL(
      url,
      typeof globalThis !== "undefined" && "location" in globalThis
        ? (globalThis as { location: { origin: string } }).location.origin
        : "http://localhost",
    );
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlObj.searchParams.append(key, String(value));
      }
    });
    url = urlObj.toString();
  }

  return url;
}

/**
 * 获取查询参数
 * 从 URL 中提取查询参数并返回对象
 * 
 * @param url URL 字符串（可选，默认使用当前页面 URL）
 * @returns 查询参数对象
 * 
 * @example
 * ```typescript
 * getQueryParams('https://example.com?page=1&limit=10');
 * // { page: '1', limit: '10' }
 * 
 * getQueryParams(); // 使用当前页面 URL
 * ```
 */
export function getQueryParams(url?: string): Record<string, string> {
  const urlObj = url
    ? new URL(url)
    : typeof globalThis !== "undefined" && "location" in globalThis
    ? new URL((globalThis as { location: { href: string } }).location.href)
    : new URL("http://localhost");

  const params: Record<string, string> = {};
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * 获取单个查询参数
 * 从 URL 中获取指定键的查询参数值
 * 
 * @param key 参数键
 * @param url URL 字符串（可选，默认使用当前页面 URL）
 * @returns 参数值，如果不存在返回 null
 * 
 * @example
 * ```typescript
 * getQueryParam('page', 'https://example.com?page=1&limit=10');
 * // '1'
 * 
 * getQueryParam('page'); // 使用当前页面 URL
 * ```
 */
export function getQueryParam(key: string, url?: string): string | null {
  const urlObj = url
    ? new URL(url)
    : typeof globalThis !== "undefined" && "location" in globalThis
    ? new URL((globalThis as { location: { href: string } }).location.href)
    : new URL("http://localhost");

  return urlObj.searchParams.get(key);
}

/**
 * 设置查询参数
 * 在 URL 中设置或更新查询参数，返回新的 URL
 * 
 * @param url URL 字符串
 * @param params 要设置的查询参数对象
 * @returns 更新后的 URL 字符串
 * 
 * @example
 * ```typescript
 * setQueryParams('https://example.com', { page: 1, limit: 10 });
 * // 'https://example.com?page=1&limit=10'
 * 
 * setQueryParams('https://example.com?page=1', { limit: 10 });
 * // 'https://example.com?page=1&limit=10'
 * ```
 */
export function setQueryParams(
  url: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const urlObj = new URL(
    url,
    typeof globalThis !== "undefined" && "location" in globalThis
      ? (globalThis as { location: { origin: string } }).location.origin
      : "http://localhost",
  );

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      urlObj.searchParams.delete(key);
    } else {
      urlObj.searchParams.set(key, String(value));
    }
  });

  return urlObj.toString();
}

/**
 * 删除查询参数
 * 从 URL 中删除指定的查询参数，返回新的 URL
 * 
 * @param url URL 字符串
 * @param keys 要删除的参数键数组
 * @returns 更新后的 URL 字符串
 * 
 * @example
 * ```typescript
 * removeQueryParams('https://example.com?page=1&limit=10&sort=name', ['page', 'limit']);
 * // 'https://example.com?sort=name'
 * ```
 */
export function removeQueryParams(url: string, keys: string[]): string {
  const urlObj = new URL(
    url,
    typeof globalThis !== "undefined" && "location" in globalThis
      ? (globalThis as { location: { origin: string } }).location.origin
      : "http://localhost",
  );

  keys.forEach((key) => {
    urlObj.searchParams.delete(key);
  });

  return urlObj.toString();
}

/**
 * 更新查询参数
 * 更新 URL 中的查询参数（保留其他参数），返回新的 URL
 * 
 * @param url URL 字符串
 * @param params 要更新的查询参数对象
 * @returns 更新后的 URL 字符串
 * 
 * @example
 * ```typescript
 * updateQueryParams('https://example.com?page=1&limit=10', { page: 2 });
 * // 'https://example.com?page=2&limit=10'
 * ```
 */
export function updateQueryParams(
  url: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  return setQueryParams(url, params);
}

/**
 * 获取 URL hash
 * 从 URL 中提取 hash 值（不含 # 符号）
 * 
 * @param url URL 字符串（可选，默认使用当前页面 URL）
 * @returns hash 值，如果不存在返回空字符串
 * 
 * @example
 * ```typescript
 * getHash('https://example.com#section1');
 * // 'section1'
 * 
 * getHash(); // 使用当前页面 URL
 * ```
 */
export function getHash(url?: string): string {
  const urlObj = url
    ? new URL(url)
    : typeof globalThis !== "undefined" && "location" in globalThis
    ? new URL((globalThis as { location: { href: string } }).location.href)
    : new URL("http://localhost");

  return urlObj.hash.slice(1); // 移除 # 符号
}

/**
 * 设置 URL hash
 * 在 URL 中设置 hash 值，返回新的 URL
 * 
 * @param url URL 字符串
 * @param hash hash 值（不含 # 符号）
 * @returns 更新后的 URL 字符串
 * 
 * @example
 * ```typescript
 * setHash('https://example.com', 'section1');
 * // 'https://example.com#section1'
 * ```
 */
export function setHash(url: string, hash: string): string {
  const urlObj = new URL(
    url,
    typeof globalThis !== "undefined" && "location" in globalThis
      ? (globalThis as { location: { origin: string } }).location.origin
      : "http://localhost",
  );

  urlObj.hash = hash.startsWith("#") ? hash : `#${hash}`;
  return urlObj.toString();
}

/**
 * 判断是否为绝对 URL
 * 检查 URL 是否为绝对路径（包含协议）
 * 
 * @param url URL 字符串
 * @returns 是否为绝对 URL
 * 
 * @example
 * ```typescript
 * isAbsoluteUrl('https://example.com'); // true
 * isAbsoluteUrl('/api/users'); // false
 * isAbsoluteUrl('api/users'); // false
 * ```
 */
export function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 拼接 URL 路径
 * 将多个路径片段拼接成完整的 URL 路径
 * 
 * @param paths 路径片段数组
 * @returns 拼接后的路径
 * 
 * @example
 * ```typescript
 * joinUrl(['api', 'users', '1']);
 * // 'api/users/1'
 * 
 * joinUrl(['/api', '/users/', '/1']);
 * // '/api/users/1'
 * 
 * joinUrl(['https://example.com', 'api', 'users']);
 * // 'https://example.com/api/users'
 * ```
 */
export function joinUrl(...paths: string[]): string {
  if (paths.length === 0) {
    return "";
  }

  // 处理第一个路径（可能包含协议）
  let result = paths[0].replace(/\/+$/, "");

  // 拼接后续路径
  for (let i = 1; i < paths.length; i++) {
    const segment = paths[i].replace(/^\/+|\/+$/g, "");
    if (segment) {
      result = `${result}/${segment}`;
    }
  }

  return result;
}

/**
 * 规范化 URL
 * 规范化 URL，移除多余的斜杠和规范化路径
 * 
 * @param url URL 字符串
 * @returns 规范化后的 URL
 * 
 * @example
 * ```typescript
 * normalizeUrl('https://example.com//api///users');
 * // 'https://example.com/api/users'
 * ```
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace(/\/+/g, "/");
    return urlObj.toString();
  } catch {
    // 如果不是完整 URL，只规范化路径部分
    return url.replace(/\/+/g, "/");
  }
}


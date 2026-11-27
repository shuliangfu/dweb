/**
 * 运行时按需 import，避免 Deno 把字面量 import() 预装进启动图。
 * 生产 server 包通过 bundle 入口预装 {@link registerDwebLazyModules} 的表，
 * 再按同一 specifier 命中已打包模块（相对路径在 dist/ 下并不存在）。
 *
 * @module
 */

export const DWEB_LAZY_MODULES_KEY = "__DWEB_LAZY_MODULES";

type LazyRegistry = Record<string, () => Promise<unknown>>;

function getLazyRegistry(): LazyRegistry | undefined {
  return (globalThis as Record<string, unknown>)[DWEB_LAZY_MODULES_KEY] as
    | LazyRegistry
    | undefined;
}

/** 由 app-lazy-modules 在服务端打包入口里注册。 */
export function registerDwebLazyModules(registry: LazyRegistry): void {
  const g = globalThis as Record<string, unknown>;
  const prev = (g[DWEB_LAZY_MODULES_KEY] as LazyRegistry | undefined) ?? {};
  g[DWEB_LAZY_MODULES_KEY] = { ...prev, ...registry };
}

/**
 * @param specifier 与注册表键一致的相对或裸 specifier
 * @param baseUrl 调用方 `import.meta.url`，用于源码态解析相对路径
 */
export function importLater<T>(
  specifier: string,
  baseUrl: string,
): Promise<T> {
  const loader = getLazyRegistry()?.[specifier];
  if (loader) return loader() as Promise<T>;
  if (specifier.startsWith("@") || !/^\.\.?\//.test(specifier)) {
    return import(specifier) as Promise<T>;
  }
  return import(new URL(specifier, baseUrl).href) as Promise<T>;
}

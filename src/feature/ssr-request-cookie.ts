/**
 * 把当前请求的 Cookie 头交给 @dreamer/view 的 SSR 作用域。
 * 本地／新版 view 提供 runWithSsrCookies；旧版 JSR 无此导出时直接渲染。
 */
import * as viewSsr from "@dreamer/view/ssr";

type RunWithSsrCookies = <T>(
  header: string,
  fn: () => T,
) => T;

/**
 * 在渲染回调期间暴露请求 Cookie，供 `document.cookie` / 组件首屏读取。
 * @param req - 当前请求；无 Cookie 头时仍进入作用域（空字符串）
 * @param fn - 同步或异步渲染函数
 */
export function withRequestCookies<T>(
  req: Request | undefined,
  fn: () => T,
): T {
  const header = req?.headers.get("Cookie") ?? "";
  const run = (viewSsr as { runWithSsrCookies?: RunWithSsrCookies })
    .runWithSsrCookies;
  if (typeof run === "function") return run(header, fn);
  return fn();
}

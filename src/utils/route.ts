/**
 * 路由字符串解析等工具
 */

/**
 * 从 route 字符串拆出 pathname（供 router.match）与 search（供 query）。
 * 用于 SSG 等场景下解析带 query 的 route（如 "/user?id=1"）。
 *
 * @param routePath - 完整 route（如 "/about" 或 "/user?id=1"）
 * @returns pathname 与 search（search 含前导 "?"，无则空串）
 */
export function parseRoutePath(
  routePath: string,
): { pathname: string; search: string } {
  const i = routePath.indexOf("?");
  if (i < 0) {
    return { pathname: routePath, search: "" };
  }
  return {
    pathname: routePath.slice(0, i),
    search: routePath.slice(i),
  };
}

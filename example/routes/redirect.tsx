/**
 * 页面重定向示例
 * 访问 /redirect 路由时，自动跳转到首页
 */

import type { LoadContext } from "@dreamer/dweb";

/**
 * 加载页面数据（服务端执行）
 * 在 load 函数中使用 res.redirect() 进行重定向
 * 
 * @param context 包含 req、res、params、query 等的上下文对象
 * @returns 如果重定向，不会返回数据（重定向会立即终止请求）
 * 
 * @example
 * // 重定向到首页
 * export const load = async ({ res }: LoadContext) => {
 *   res.redirect('/');
 * };
 * 
 * @example
 * // 重定向到指定路径，使用自定义状态码
 * export const load = async ({ res }: LoadContext) => {
 *   res.redirect('/new-path', 301); // 301 永久重定向
 * };
 * 
 * @example
 * // 根据条件重定向
 * export const load = async ({ req, res, query }: LoadContext) => {
 *   const target = query.target || '/';
 *   res.redirect(target);
 * };
 */
export const load = ({ res }: LoadContext) => {
  // 重定向到首页
  // 默认使用 302 临时重定向
  // res.redirect('/');
  
  // 如果需要永久重定向，可以使用 301
  res.redirect('/', 301);
};


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

/**
 * 页面组件（实际上不会渲染，因为 load 函数已经重定向了）
 * 但如果客户端直接访问或重定向失败，这个组件会作为后备显示
 * 
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function RedirectPage({ params: _params, query: _query, data: _data }: {
  params: Record<string, string>;
  query: Record<string, string>;
  data: unknown;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          正在跳转...
        </h1>
        <p className="text-gray-600 mb-4">
          如果页面没有自动跳转，请
          <a href="/" className="text-blue-600 hover:text-blue-800 underline ml-1">
            点击这里
          </a>
          返回首页
        </p>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
}


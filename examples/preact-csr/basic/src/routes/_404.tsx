/**
 * 404 错误页面
 * 当访问不存在的路由时显示
 */

/**
 * 404 页面组件
 * @returns 404 错误页面
 */
export default function NotFound() {
  return (
    <div class="py-24 px-5 text-center">
      <h1 class="mb-5 text-8xl font-bold text-gray-300">404</h1>
      <p class="mb-8 text-2xl text-gray-600">页面未找到</p>
      <a
        href="/"
        class="inline-block rounded-md bg-blue-600 px-6 py-3 text-white no-underline transition-colors hover:bg-blue-700"
      >
        返回首页
      </a>
    </div>
  );
}

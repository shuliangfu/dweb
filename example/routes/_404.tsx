/**
 * 404 错误页面
 * 使用 Preact + Tailwind CSS v4
 */

export const metadata = {
  title: "404 - 页面未找到",
  description: "抱歉，您访问的页面不存在。请检查 URL 是否正确，或返回首页。",
  keywords: "404, 页面未找到, DWeb",
  author: "DWeb",
  robots: false, // 404 页面不需要被搜索引擎索引
};

export default function NotFoundPage({ error }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
          404
        </h1>
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-white mb-4">
          页面未找到
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          抱歉，您访问的页面不存在。请检查 URL 是否正确，或返回首页。
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}

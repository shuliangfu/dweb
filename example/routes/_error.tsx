/**
 * 错误页面
 * 使用 Preact + Tailwind CSS v4
 */

export const metadata = {
  title: '500 - 服务器错误',
  description: '发生了服务器错误。请稍后重试，或联系管理员。',
  keywords: '500, 服务器错误, DWeb',
  author: 'DWeb',
  robots: false, // 错误页面不需要被搜索引擎索引
};

export default function ErrorPage({ error }: { error?: { message?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 to-pink-100">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-9xl font-bold text-red-600 mb-4">500</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">服务器错误</h2>
        <p className="text-lg text-gray-600 mb-8">
          {error?.message || '发生了未知错误。请稍后重试，或联系管理员。'}
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}

/**
 * 错误页面
 * 使用 UnoCSS 样式
 */

interface ErrorProps {
  error?: Error;
  statusCode?: number;
}

export default function ErrorPage({ error, statusCode = 500 }: ErrorProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">{statusCode}</h1>
        <p className="text-xl text-gray-600 mt-2">
          {error?.message || "服务器内部错误"}
        </p>
        <p className="text-gray-500 mt-4">请稍后再试或联系管理员</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}

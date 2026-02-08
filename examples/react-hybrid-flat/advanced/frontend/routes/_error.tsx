/**
 * 错误页面
 */

interface ErrorProps {
  error?: Error;
  statusCode?: number;
}

export default function ErrorPage({ error, statusCode = 500 }: ErrorProps) {
  return (
    <div className="py-24 text-center">
      <h1 className="mb-5 text-8xl font-bold text-red-500">{statusCode}</h1>
      <p className="mb-8 text-xl text-gray-600">
        {error?.message || "服务器内部错误"}
      </p>
      <a
        href="/"
        className="inline-block rounded-md bg-blue-600 px-6 py-3 text-white no-underline hover:bg-blue-700"
      >
        返回首页
      </a>
    </div>
  );
}

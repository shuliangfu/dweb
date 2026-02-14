/**
 * 错误页面
 * 当发生错误时显示
 */

/** 错误页面属性 */
interface ErrorProps {
  /** 错误对象 */
  error?: Error;
  /** 错误状态码 */
  statusCode?: number;
}

/**
 * 错误页面组件
 * @param props - 组件属性
 * @returns 错误页面
 */
export default function ErrorPage({ error, statusCode = 500 }: ErrorProps) {
  return (
    <div className="py-24 px-5 text-center">
      <h1 className="mb-5 text-8xl font-bold text-red-500">{statusCode}</h1>
      <p className="mb-8 text-xl text-gray-600">
        {error?.message || "服务器内部错误"}
      </p>
      <a
        href="/"
        className="inline-block rounded-md bg-blue-600 px-6 py-3 text-white no-underline transition-colors hover:bg-blue-700"
      >
        返回首页
      </a>
    </div>
  );
}

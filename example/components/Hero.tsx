/**
 * Hero 区域组件
 * 用于首页顶部的大标题区域
 */

interface HeroProps {
  /** 主标题 */
  title: string;
  /** 副标题 */
  subtitle: string;
  /** 主要 CTA 按钮文本 */
  primaryCTA?: string;
  /** 主要 CTA 链接 */
  primaryCTALink?: string;
  /** 次要 CTA 按钮文本 */
  secondaryCTA?: string;
  /** 次要 CTA 链接 */
  secondaryCTALink?: string;
  /** 版本号（可选，如果不提供则尝试从 globalThis.__PAGE_DATA__ 获取） */
  version?: string;
}

/**
 * Hero 区域组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Hero({
  title,
  subtitle,
  primaryCTA = "快速开始",
  primaryCTALink = "/docs",
  secondaryCTA = "查看文档",
  secondaryCTALink = "/docs",
  version,
}: HeroProps) {
  // 获取版本号：优先使用 props，其次从 globalThis.__PAGE_DATA__ 获取
  const versionString = version ||
    (typeof globalThis !== "undefined" &&
      (globalThis as {
        __PAGE_DATA__?: { versionInfo?: { versionString?: string } };
      }).__PAGE_DATA__?.versionInfo?.versionString) ||
    null;
  return (
    <div className="relative overflow-hidden bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20 lg:py-32">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob">
        </div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000">
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000">
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* 主标题 */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6">
            <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {/* 副标题 */}
          <p className="mt-6 text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          {/* CTA 按钮组 */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={primaryCTALink}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {primaryCTA}
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
            <a
              href={secondaryCTALink}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700"
            >
              {secondaryCTA}
            </a>
          </div>

          {/* 版本信息 */}
          {versionString && (
            <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-green-500 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                最新版本 {versionString} 22 dd
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 404 错误页面
 * 使用 Tailwind CSS v4 样式
 */

export default function NotFound() {
  return (
    <div class="min-h-[60vh] flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-9xl font-bold text-gray-200">404</h1>
        <p class="text-2xl font-semibold text-gray-600 mt-4">页面未找到</p>
        <p class="text-gray-500 mt-2">抱歉，您访问的页面不存在</p>
        <a
          href="/"
          class="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          返回首页
        </a>
      </div>
    </div>
  );
}

/**
 * 首页
 * 使用 Tailwind CSS v4 样式
 */

export default function Home() {
  return (
    <div class="space-y-12">
      {/* Hero 区域 */}
      <section class="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-600 to-primary-800 text-white p-12">
        <div class="relative z-10">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">
            Preact Advanced Example
          </h1>
          <p class="text-xl text-primary-100 mb-8 max-w-2xl">
            一个完整的全栈应用示例，使用 @dreamer/dweb 框架构建，
            采用前后端分离架构，集成 Tailwind CSS v4
          </p>
          <div class="flex flex-wrap gap-4">
            <a
              href="/users"
              class="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition-colors"
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              用户管理
            </a>
            <a
              href="/about"
              class="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              了解更多
            </a>
          </div>
        </div>
        {/* 装饰背景 */}
        <div class="absolute right-0 top-0 w-1/2 h-full opacity-10">
          <svg viewBox="0 0 400 400" class="w-full h-full">
            <circle
              cx="200"
              cy="200"
              r="150"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
            />
            <circle
              cx="200"
              cy="200"
              r="100"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
            />
            <circle
              cx="200"
              cy="200"
              r="50"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
            />
          </svg>
        </div>
      </section>

      {/* 特性区域 */}
      <section>
        <h2 class="text-2xl font-bold text-gray-900 mb-8 text-center">
          核心特性
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: "🏗️",
              title: "前后端分离",
              desc: "独立的后端 API 和前端 SSR 服务",
            },
            {
              icon: "⚡",
              title: "Preact SSR",
              desc: "轻量级服务端渲染，极致性能",
            },
            {
              icon: "🎨",
              title: "Tailwind CSS v4",
              desc: "现代化 CSS 框架，快速构建 UI",
            },
            {
              icon: "📦",
              title: "TypeScript",
              desc: "完整的类型安全支持",
            },
          ].map((feature) => (
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div class="text-4xl mb-4">{feature.icon}</div>
              <h3 class="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p class="text-gray-600 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 架构说明 */}
      <section class="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">项目架构</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span class="text-blue-600 font-bold">B</span>
              </div>
              <h3 class="font-semibold">Backend (端口 3001)</h3>
            </div>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                RESTful API
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                用户管理服务
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                健康检查接口
              </li>
            </ul>
          </div>
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span class="text-green-600 font-bold">F</span>
              </div>
              <h3 class="font-semibold">Frontend (端口 3000)</h3>
            </div>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Preact SSR 渲染
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                文件路由系统
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Tailwind CSS v4
              </li>
            </ul>
          </div>
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span class="text-purple-600 font-bold">C</span>
              </div>
              <h3 class="font-semibold">Common (共享)</h3>
            </div>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                类型定义
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                公共服务
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                工具函数
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

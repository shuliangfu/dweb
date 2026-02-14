/**
 * 关于页面
 * 使用 Tailwind CSS v4 样式
 */

export default function About() {
  return (
    <div class="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-4">关于项目</h1>
        <p class="text-lg text-gray-600">
          这是一个使用 @dreamer/dweb 框架构建的全栈应用示例，
          展示了前后端分离架构的最佳实践。
        </p>
      </div>

      {/* 技术栈 */}
      <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">技术栈</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "@dreamer/dweb", desc: "全栈框架" },
            { name: "View", desc: "UI 引擎" },
            { name: "Tailwind CSS v4", desc: "样式框架" },
            { name: "Deno", desc: "运行时" },
            { name: "TypeScript", desc: "编程语言" },
            { name: "SSR", desc: "渲染模式" },
            { name: "RESTful API", desc: "接口规范" },
            { name: "文件路由", desc: "路由系统" },
          ].map((tech) => (
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="font-medium text-gray-900">{tech.name}</div>
              <div class="text-sm text-gray-500">{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 目录结构 */}
      <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">目录结构</h2>
        <pre class="bg-gray-900 text-gray-100 rounded-lg p-6 overflow-x-auto text-sm">
{`my-app/
├── src/
│   ├── backend/         # 后台管理
│   │   ├── main.ts     # 后台入口
│   │   ├── routes/     # 后台页面路由
│   │   │   ├── _app.tsx
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx    # 仪表盘
│   │   │   ├── users/       # 用户管理
│   │   │   └── settings.tsx # 系统设置
│   │   └── config/     # 后台配置
│   ├── frontend/       # 前台网站
│   │   ├── main.ts     # 前台入口
│   │   ├── routes/     # 页面路由
│   │   │   ├── _app.tsx
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── about.tsx
│   │   │   └── users/
│   │   └── config/     # 前台配置
│   └── common/         # 公共代码
│       ├── types/      # 类型定义
│       ├── services/   # 公共服务
│       ├── utils/      # 工具函数
│       └── config/     # 公共配置
└── deno.json`}
        </pre>
      </div>

      {/* 应用页面 */}
      <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">页面路由</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-medium text-gray-900 mb-3">前台网站 (端口 3000)</h3>
            <ul class="space-y-2 text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                <code class="text-sm">/</code> - 首页
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                <code class="text-sm">/about</code> - 关于
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                <code class="text-sm">/users</code> - 用户列表
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                <code class="text-sm">/users/:id</code> - 用户详情
              </li>
            </ul>
          </div>
          <div>
            <h3 class="font-medium text-gray-900 mb-3">后台管理 (端口 3001)</h3>
            <ul class="space-y-2 text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                <code class="text-sm">/admin</code> - 仪表盘
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                <code class="text-sm">/admin/users</code> - 用户管理
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                <code class="text-sm">/admin/users/:id</code> - 用户编辑
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                <code class="text-sm">/admin/settings</code> - 系统设置
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

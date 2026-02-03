/**
 * 首页
 */

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-linear-to-br from-primary-600 to-primary-800 text-white p-12">
        <h1 className="text-4xl font-bold mb-4">React Advanced Example</h1>
        <p className="text-xl text-primary-100 mb-8 max-w-2xl">
          一个完整的全栈应用示例，使用 @dreamer/dweb
          框架构建，采用前后端分离架构
        </p>
        <div className="flex gap-4">
          <a
            href="/users"
            className="inline-flex px-6 py-3 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            用户管理
          </a>
          <a
            href="/about"
            className="inline-flex px-6 py-3 border-2 border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            了解更多
          </a>
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          核心特性
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: "🏗️",
              title: "前后端分离",
              desc: "独立的后端 API 和前端 SSR 服务",
            },
            { icon: "⚡", title: "React SSR", desc: "服务端渲染，极致性能" },
            { icon: "🎨", title: "Tailwind CSS v4", desc: "现代化 CSS 框架" },
            { icon: "📦", title: "TypeScript", desc: "完整的类型安全支持" },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

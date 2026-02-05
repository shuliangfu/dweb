/**
 * 关于页面
 * 路由: /about
 */

/**
 * 关于页面
 * @returns 关于页面内容
 */
export default function About() {
  return (
    <div className="py-5">
      <h1 className="mb-8 text-3xl font-bold">关于我们</h1>

      <section className="rounded-lg bg-white p-8 shadow-md">
        <p className="mb-6">
          这是一个使用 <strong>@dreamer/dweb</strong> 框架和{" "}
          <strong>Preact</strong> + <strong>UnoCSS</strong> 构建的示例项目。
        </p>

        <h2 className="mb-4 mt-6 text-xl font-semibold text-indigo-600">
          技术栈
        </h2>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>@dreamer/dweb</strong> - 全栈 Web 框架
          </li>
          <li>
            <strong>Preact</strong> - 轻量级 React 替代方案
          </li>
          <li>
            <strong>UnoCSS</strong> - 即时按需的原子化 CSS 引擎
          </li>
          <li>
            <strong>Deno</strong> - 现代 JavaScript/TypeScript 运行时
          </li>
          <li>
            <strong>TypeScript</strong> - 类型安全的 JavaScript
          </li>
        </ul>

        <h2 className="mb-4 mt-6 text-xl font-semibold text-indigo-600">
          项目结构
        </h2>
        <pre className="overflow-x-auto rounded-md bg-gray-100 p-4 text-sm">{`
my-app/
├── src/
│   ├── routes/          # 文件路由
│   │   ├── _app.tsx    # 应用根组件
│   │   ├── _layout.tsx # 布局组件
│   │   ├── _404.tsx    # 404 错误页面
│   │   ├── _error.tsx  # 错误页面
│   │   ├── index.tsx   # / 路由
│   │   ├── about.tsx   # /about 路由
│   │   └── user/
│   │       └── [id].tsx # /user/:id 路由
│   ├── main.ts         # 服务端入口
│   └── config/         # 配置文件
└── deno.json
        `}</pre>
      </section>
    </div>
  );
}

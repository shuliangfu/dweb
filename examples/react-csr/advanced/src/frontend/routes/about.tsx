/**
 * 关于页面
 */

export default function About() {
  return (
    <div className="py-5">
      <h1 className="mb-8 text-3xl font-bold">关于我们</h1>
      <section className="rounded-lg bg-white p-8 shadow-md">
        <p className="mb-6">
          这是一个使用 <strong>@dreamer/dweb</strong> 和 <strong>React</strong>
          {" "}
          构建的全栈示例。
        </p>
        <h2 className="mb-4 text-xl font-semibold text-indigo-600">技术栈</h2>
        <ul className="ml-5 list-disc space-y-2">
          <li>@dreamer/dweb - 全栈 Web 框架</li>
          <li>React - 流行的 UI 库</li>
          <li>Deno - 现代 JavaScript 运行时</li>
          <li>TypeScript - 类型安全</li>
        </ul>
      </section>
    </div>
  );
}

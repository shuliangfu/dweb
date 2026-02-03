/**
 * 首页组件
 * 路由: /
 */

/**
 * 首页
 */
export default function Home() {
  return (
    <div className="py-5">
      <section className="mb-10 rounded-xl bg-linear-to-br from-[#667eea] to-[#764ba2] px-5 py-15 text-center text-white">
        <h1 className="mb-4 text-4xl">欢迎使用 React Basic</h1>
        <p className="text-xl text-white/90">
          这是一个使用 @dreamer/dweb 框架构建的 React 示例项目
        </p>
      </section>

      <section>
        <h2 className="mb-8 text-center">特性</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">文件路由</h3>
            <p>基于文件系统的路由，无需手动配置</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">SSR 渲染</h3>
            <p>服务端渲染，提供最佳首屏性能</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">React</h3>
            <p>流行的 UI 库</p>
          </div>
        </div>
      </section>
    </div>
  );
}

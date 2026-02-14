/**
 * 首页组件
 * 路由: /
 */

/**
 * 首页
 * @returns 首页内容
 */
export default function Home() {
  return (
    <div class="py-5">
      <section class="mb-10 rounded-xl bg-linear-to-br from-[#667eea] to-[#764ba2] px-5 py-15 text-center text-white">
        <h1 class="mb-4 text-4xl">欢迎使用 Dweb 框架</h1>
        <p class="text-xl text-white/90">
          这是一个使用 @dreamer/dweb 框架构建的 View 示例项目
        </p>
      </section>

      <section>
        <h2 class="mb-8 text-center">特性</h2>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">文件路由</h3>
            <p>基于文件系统的路由，无需手动配置</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">SSR 渲染</h3>
            <p>服务端渲染，提供最佳首屏性能</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-md">
            <h3 class="mb-2.5 text-[#667eea]">Preact</h3>
            <p>轻量级响应式视图引擎</p>
          </div>
        </div>
      </section>
    </div>
  );
}

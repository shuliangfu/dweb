// import "../assets/index.css";

/**
 * 页面 Tailwind 类名（全部提取为静态对象，便于生产构建扫描）
 */
const classes = {
  page: "py-5",
  hero:
    "mb-10 rounded-xl bg-linear-to-br from-[#667eea] to-[#764ba2] px-5 py-15 text-center text-white",
  heroTitle: "mb-4 text-4xl",
  heroDesc: "text-xl text-white/90",
  section: "mb-10",
  sectionTitle: "mb-8 text-center",
  featureGrid: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4",
  featureCard: "rounded-lg bg-white p-6 shadow-md",
  featureCardTitle: "mb-2.5 text-[#667eea]",
};

/**
 * 首页组件
 * 路由: /
 */
export default function Home() {
  return (
    <div class={classes.page}>
      <section class={classes.hero}>
        <h1 class={classes.heroTitle}>欢迎使用 Dweb 框架</h1>
        <p class={classes.heroDesc}>
          这是一个使用 @dreamer/dweb 框架构建的 View 示例项目
        </p>
      </section>

      <section class={classes.section}>
        <h2 class={classes.sectionTitle}>特性</h2>
        <div class={classes.featureGrid}>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>文件路由</h3>
            <p>基于文件系统的路由，无需手动配置</p>
          </div>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>SSR 渲染</h3>
            <p>服务端渲染，提供最佳首屏性能</p>
          </div>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </div>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>View</h3>
            <p>轻量级响应式视图引擎</p>
          </div>
        </div>
      </section>
    </div>
  );
}

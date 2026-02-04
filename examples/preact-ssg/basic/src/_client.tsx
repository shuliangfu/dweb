/**
 * 客户端入口文件（由 @dreamer/dweb 自动生成，仅当不存在时生成，可手动编辑）
 * 从 _client.dep.tsx 导入 initApp；在 .then((app) => { ... }) 中可直接使用 app。
 * - i18n：i18n.onChange(() => app.renderCurrentRoute())
 * - 路由拦截：app.router.beforeRoute((to, from) => { ... })、app.router.afterRoute((to, from) => { ... })
 */

import { initApp } from "./_client.dep.tsx";

initApp()
  .then((app) => {
    // 获取当前路由（两种方式任选其一）
    const pathname = globalThis.location?.pathname || "/";
    const currentRoute = app.router.getCurrentRoute?.() ??
      app.router.match(pathname);
    if (currentRoute) {
      console.log(
        "当前路由:",
        currentRoute.route.component,
        currentRoute.params,
      );
    }

    // 路由前置守卫（拦截）：在导航前执行，返回 false 阻止导航，返回 string 重定向到该路径
    app.router.beforeRoute((_to, _from) => {
      // 示例：需要登录的页面重定向到登录
      // if (to?.route.meta?.requiresAuth && !isLoggedIn()) return "/login";
      // 示例：阻止访问某路径
      // if (to?.route.component === "admin") return false;
      return true; // 放行
    });

    // 路由后置守卫：导航完成后执行（可做埋点、日志等）
    app.router.afterRoute((to, _from) => {
      if (to) {
        console.log("路由已切换:", to.route.component, to.params, to.query);
      }
    });
  })
  .catch(console.error);

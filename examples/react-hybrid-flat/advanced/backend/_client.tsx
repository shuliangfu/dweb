/**
 * 客户端入口（后台）
 */

import { initApp } from "./_client.dep.tsx";

initApp().then((app) => {
  app.router.beforeRoute(() => true);
}).catch(console.error);
